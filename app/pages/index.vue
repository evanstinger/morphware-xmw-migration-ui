<script setup lang="ts">
import { useWeb3Store } from '~/stores/web3'
import { useMigrationRevertContract, type RevertMetrics } from '~/composables/useMigrationRevertContract'
import { shortenAddress, formatTokenAmount } from '~/utils/string'
import { MaxUint256, parseUnits } from 'ethers'

const web3Store = useWeb3Store()
const migrationRevertContract = useMigrationRevertContract()
const runtimeConfig = useRuntimeConfig()
const toast = useToast()

const metrics = ref<RevertMetrics | null>(null)
const oldTokenSymbol = ref('XMW')
const newTokenSymbol = ref('XMW')
const revertAmount = ref('')
const isApproving = ref(false)
const isReverting = ref(false)
const newTokenAllowance = ref(0n)
const error = ref('')
const isPaused = ref(false)

const explorerBaseUrl = 'https://etherscan.io'
const revertContractAddress = computed(() => {
  return (runtimeConfig.public.migrationRevertContractAddress as string) || migrationRevertContract.address
})

const resetUiState = () => {
  metrics.value = null
  newTokenAllowance.value = 0n
  revertAmount.value = ''
  error.value = ''
  isPaused.value = false
}

const getErrorMessage = (e: unknown, fallback: string): string => {
  if (e && typeof e === 'object') {
    const err = e as { code?: string | number, message?: string }
    if (err.code === 4001 || err.code === 'ACTION_REJECTED') return 'Transaction rejected by user'
    if (err.message) return err.message
  }
  return fallback
}

const refreshMetrics = async () => {
  if (!web3Store.address) return
  error.value = ''
  try {
    const [nextMetrics, oldTokenAddr, newTokenAddr, paused] = await Promise.all([
      migrationRevertContract.getRevertMetrics(web3Store.address),
      migrationRevertContract.getOldTokenAddress(),
      migrationRevertContract.getNewTokenAddress(),
      migrationRevertContract.getPaused()
    ])

    const oldTokenContract = migrationRevertContract.getOldTokenContract(oldTokenAddr)
    const newTokenContract = migrationRevertContract.getNewTokenContract(newTokenAddr)

    const [oldSymbol, newSymbol, allowance] = await Promise.all([
      oldTokenContract.read('symbol'),
      newTokenContract.read('symbol'),
      newTokenContract.read('allowance', [web3Store.address, migrationRevertContract.address])
    ])

    metrics.value = nextMetrics
    isPaused.value = paused
    oldTokenSymbol.value = oldSymbol
    newTokenSymbol.value = newSymbol
    newTokenAllowance.value = migrationRevertContract.asBigInt(allowance)
  } catch (e: unknown) {
    error.value = getErrorMessage(e, 'Failed to fetch revert data')
  }
}

const checkAllowance = async () => {
  if (!web3Store.address) return
  const newTokenAddr = await migrationRevertContract.getNewTokenAddress()
  const newTokenContract = migrationRevertContract.getNewTokenContract(newTokenAddr)
  const allowance = await newTokenContract.read('allowance', [web3Store.address, migrationRevertContract.address])
  newTokenAllowance.value = migrationRevertContract.asBigInt(allowance)
}

const normalizeAmountInput = (value: string): string => {
  const compactValue = value.replace(/\s+/g, '').replace(/,/g, '.')
  let normalized = ''
  let hasDecimalPoint = false

  for (const char of compactValue) {
    if (char >= '0' && char <= '9') {
      normalized += char
      continue
    }
    if (char === '.' && !hasDecimalPoint) {
      normalized += char
      hasDecimalPoint = true
    }
  }

  if (normalized.startsWith('.')) {
    return `0${normalized}`
  }

  return normalized
}

const sanitizeRevertAmount = () => {
  const normalized = normalizeAmountInput(revertAmount.value)
  if (normalized !== revertAmount.value) {
    revertAmount.value = normalized
  }
}

const parsedRevertAmount = computed<bigint | null>(() => {
  if (!metrics.value) return null

  const normalizedAmount = normalizeAmountInput(revertAmount.value)
  if (!normalizedAmount) return null

  const [_, fraction = ''] = normalizedAmount.split('.')
  if (fraction.length > metrics.value.decimals) return null

  const valueForParse = normalizedAmount.endsWith('.')
    ? normalizedAmount.slice(0, -1)
    : normalizedAmount
  if (!valueForParse) return null

  try {
    return parseUnits(valueForParse, metrics.value.decimals)
  } catch {
    return null
  }
})

const amountValidationError = computed(() => {
  if (!revertAmount.value || !metrics.value) return ''

  const normalizedAmount = normalizeAmountInput(revertAmount.value)
  if (!normalizedAmount) return 'Enter a valid number'
  if (normalizedAmount.endsWith('.')) return ''

  const [_, fraction = ''] = normalizedAmount.split('.')
  if (fraction.length > metrics.value.decimals) {
    return `Max ${metrics.value.decimals} decimal places`
  }

  const amount = parsedRevertAmount.value
  if (amount === null) return 'Enter a valid amount'
  if (amount <= 0n) return 'Amount must be greater than 0'
  if (amount > metrics.value.userNewTokenBalance) return 'Amount exceeds balance'

  return ''
})

const approveTokens = async () => {
  if (!metrics.value || isApproving.value || isPaused.value) return
  const amount = parsedRevertAmount.value
  if (amount === null || amount <= 0n || amount > metrics.value.userNewTokenBalance) return

  isApproving.value = true
  error.value = ''

  try {
    const newTokenAddr = await migrationRevertContract.getNewTokenAddress()
    const newTokenContract = migrationRevertContract.getNewTokenContract(newTokenAddr)

    const tx = await newTokenContract.write('approve', [revertContractAddress.value, MaxUint256])

    await tx.wait()

    toast.add({
      title: 'Approval Successful',
      description: 'You can now proceed to revert your tokens.',
      icon: 'i-lucide-check-circle',
      color: 'success',
      actions: [{
        label: 'View on Explorer',
        to: `${explorerBaseUrl}/tx/${tx.hash}`,
        target: '_blank',
        color: 'neutral',
        variant: 'outline'
      }]
    })

    await checkAllowance()
  } catch (e: unknown) {
    error.value = getErrorMessage(e, 'Failed to approve tokens')
  } finally {
    isApproving.value = false
  }
}

const revertTokens = async () => {
  if (!metrics.value || isReverting.value || isPaused.value) return
  const amount = parsedRevertAmount.value
  if (amount === null || amount <= 0n || amount > metrics.value.userNewTokenBalance || newTokenAllowance.value < amount) return

  isReverting.value = true
  error.value = ''

  try {
    const tx = await migrationRevertContract.revertMigration(amount)

    toast.add({
      title: 'Revert Submitted',
      description: 'Transaction has been submitted to the network.',
      icon: 'i-lucide-send',
      color: 'warning',
      actions: [{
        label: 'View on Explorer',
        to: `${explorerBaseUrl}/tx/${tx.hash}`,
        target: '_blank',
        color: 'neutral',
        variant: 'outline'
      }]
    })

    await tx.wait()

    toast.add({
      title: 'Revert Successful',
      description: 'Your tokens have been successfully reverted.',
      icon: 'i-lucide-party-popper',
      color: 'success',
      duration: 0,
      actions: [{
        label: 'View on Explorer',
        to: `${explorerBaseUrl}/tx/${tx.hash}`,
        target: '_blank',
        color: 'neutral',
        variant: 'outline'
      }]
    })

    await refreshMetrics()
    revertAmount.value = ''
  } catch (e: unknown) {
    error.value = getErrorMessage(e, 'Failed to revert tokens')
  } finally {
    isReverting.value = false
  }
}

const setMaxAmount = () => {
  if (!metrics.value) return
  revertAmount.value = formatTokenAmount(metrics.value.userNewTokenBalance, metrics.value.decimals)
}

const needsApproval = computed(() => {
  if (!metrics.value) return false
  const amount = parsedRevertAmount.value
  if (amount === null || amount <= 0n || amount > metrics.value.userNewTokenBalance) return false
  return newTokenAllowance.value < amount
})

const canApprove = computed(() => {
  if (!metrics.value || !web3Store.isConnected || isPaused.value || isApproving.value) return false
  const amount = parsedRevertAmount.value
  if (amount === null || amount <= 0n || amount > metrics.value.userNewTokenBalance) return false
  return newTokenAllowance.value < amount
})

const canRevert = computed(() => {
  if (!metrics.value || !web3Store.isConnected || isPaused.value) return false
  if (amountValidationError.value) return false
  const amount = parsedRevertAmount.value
  if (amount === null || amount <= 0n) return false
  return amount <= metrics.value.userNewTokenBalance && newTokenAllowance.value >= amount
})

const canSubmitRevert = computed(() => {
  return canRevert.value && !isReverting.value && !needsApproval.value
})

watch(() => web3Store.address, () => {
  if (web3Store.address) {
    refreshMetrics()
  } else {
    resetUiState()
  }
}, { immediate: true })

watch(() => web3Store.chainId, () => {
  if (!web3Store.address) {
    resetUiState()
    return
  }

  if (web3Store.chainId === migrationRevertContract.chainId) {
    refreshMetrics()
  } else {
    resetUiState()
  }
})
</script>

<template>
  <div class="min-h-screen relative overflow-hidden">
    <div
      class="absolute inset-0 bg-cover bg-center bg-no-repeat"
      style="background-image: url('/xmw-bg.png');"
    />
    <div class="absolute inset-0 bg-black/40" />

    <div class="relative z-10 min-h-screen flex flex-col">
      <header class="flex items-center justify-between px-6 py-4 lg:px-12">
        <div class="flex items-center gap-3">
          <img
            src="https://framerusercontent.com/images/0wJIpnHR4fliia1jeMqNRxw13k.png"
            alt="Morphware"
            class="w-8 h-8"
          >
          <span class="text-white font-semibold text-lg tracking-tight">morphware</span>
        </div>

        <nav class="hidden md:flex items-center gap-8 text-sm text-white/80">
          <a
            href="https://www.morphware.com/about"
            target="_blank"
            class="hover:text-white transition-colors"
          >About</a>
          <a
            href="https://www.morphware.com/sustainability"
            target="_blank"
            class="hover:text-white transition-colors"
          >Sustainability</a>
          <a
            href="https://www.morphware.com/hardware"
            target="_blank"
            class="hover:text-white transition-colors"
          >Hardware</a>
          <a
            href="https://www.morphware.com/xmw"
            target="_blank"
            class="hover:text-white transition-colors"
          >XMW</a>
        </nav>

        <ClientOnly>
          <div class="flex items-center gap-3">
            <UButton
              v-if="web3Store.address"
              color="neutral"
              variant="solid"
              class="bg-white text-black hover:bg-white/90"
              @click="web3Store.disconnectWallet()"
            >
              {{ shortenAddress(web3Store.address) }}
              <UIcon
                name="i-lucide-log-out"
                class="w-4 h-4"
              />
            </UButton>
            <UButton
              v-else
              color="neutral"
              variant="solid"
              size="lg"
              class="px-8 font-medium bg-white text-black hover:bg-white/90"
              @click="web3Store.connectWallet()"
            >
              Connect Wallet
            </UButton>
          </div>
        </ClientOnly>
      </header>

      <main class="flex-1 flex flex-col justify-center px-6 lg:px-12 py-12">
        <div class="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          <div class="space-y-6">
            <h1 class="text-5xl lg:text-7xl font-light text-white leading-tight">
              Migration<br>
              Revert
            </h1>
            <p class="text-white/70 text-lg max-w-md">
              The community cancelled the migration program.
              Revert migrated XMW back to the original token at 1:1 with no fees.
            </p>
          </div>

          <div class="space-y-4">
            <div class="relative group">
              <div class="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000" />
              <UCard
                class="relative bg-black/80 backdrop-blur-2xl border-white/10 ring-1 ring-white/10 shadow-2xl rounded-2xl"
                :ui="{
                  body: 'p-6 sm:p-8'
                }"
              >
                <div class="space-y-8">
                  <!-- Header -->
                  <div class="flex items-center justify-between">
                    <div>
                      <h2 class="text-white font-semibold text-xl tracking-tight">
                        Revert Status
                      </h2>
                      <p class="text-white/40 text-sm mt-1">
                        Track your token revert progress
                      </p>
                    </div>
                    <UBadge
                      v-if="isPaused"
                      color="error"
                      variant="subtle"
                      size="md"
                      class="rounded-full px-3"
                    >
                      <UIcon
                        name="i-lucide-pause-circle"
                        class="w-4 h-4 mr-1.5"
                      />
                      Paused
                    </UBadge>
                    <UBadge
                      v-else
                      color="primary"
                      variant="subtle"
                      size="md"
                      class="rounded-full px-3 bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
                    >
                      <span class="relative flex h-2 w-2 mr-2">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      Active
                    </UBadge>
                  </div>

                  <!-- Connect Wallet State -->
                  <div
                    v-if="!web3Store.isConnected"
                    class="text-center py-12 px-4 rounded-xl bg-white/5 border border-white/5"
                  >
                    <div class="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 ring-1 ring-white/10">
                      <UIcon
                        name="i-lucide-wallet"
                        class="w-8 h-8 text-white/40"
                      />
                    </div>
                    <h3 class="text-white font-medium text-lg mb-2">
                      Connect Wallet
                    </h3>
                    <p class="text-white/40 mb-6 max-w-xs mx-auto">
                      Connect your wallet to view your balance and start the revert process.
                    </p>
                    <UButton
                      color="neutral"
                      variant="solid"
                      size="lg"
                      class="px-8 font-medium bg-white text-black hover:bg-white/90"
                      @click="web3Store.connectWallet()"
                    >
                      Connect Wallet
                    </UButton>
                  </div>

                  <!-- Wrong Network State -->
                  <div
                    v-else-if="web3Store.chainId !== migrationRevertContract.chainId"
                    class="text-center py-12 px-4 rounded-xl bg-white/5 border border-white/5"
                  >
                    <div class="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 ring-1 ring-amber-500/20">
                      <UIcon
                        name="i-lucide-network"
                        class="w-8 h-8 text-amber-500"
                      />
                    </div>
                    <h3 class="text-white font-medium text-lg mb-2">
                      Wrong Network
                    </h3>
                    <p class="text-white/40 mb-6 max-w-xs mx-auto">
                      Please switch your wallet to the configured revert network to continue.
                    </p>
                    <UButton
                      color="neutral"
                      variant="solid"
                      size="lg"
                      class="px-8 font-medium bg-white text-black hover:bg-white/90"
                      @click="web3Store.setChain(`0x${migrationRevertContract.chainId.toString(16)}`)"
                    >
                      Switch Network
                    </UButton>
                  </div>

                  <!-- Active State -->
                  <div
                    v-else-if="metrics"
                    class="space-y-8"
                  >
                    <!-- Metrics Grid -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <!-- Old Token Balance -->
                      <div class="bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-5 border border-white/5 relative overflow-hidden group/card hover:border-white/10 transition-colors">
                        <div class="absolute top-0 right-0 p-4 opacity-10 group-hover/card:opacity-20 transition-opacity">
                          <UIcon
                            name="i-lucide-wallet"
                            class="w-12 h-12"
                          />
                        </div>
                        <p class="text-white/40 text-sm font-medium mb-2 flex items-center gap-2">
                          <span class="w-2 h-2 rounded-full bg-white/20" />
                          Old Token Balance
                        </p>
                        <div class="flex items-baseline gap-2">
                          <p class="text-white text-2xl font-bold tracking-tight">
                            {{ formatTokenAmount(metrics.userOldTokenBalance, metrics.decimals) }}
                          </p>
                          <span class="text-white/40 text-sm font-medium">{{ oldTokenSymbol }}</span>
                        </div>
                      </div>

                      <!-- New Token Balance -->
                      <div class="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-xl p-5 border border-emerald-500/10 relative overflow-hidden group/card hover:border-emerald-500/20 transition-colors">
                        <div class="absolute top-0 right-0 p-4 opacity-10 group-hover/card:opacity-20 transition-opacity">
                          <UIcon
                            name="i-lucide-sparkles"
                            class="w-12 h-12 text-emerald-400"
                          />
                        </div>
                        <p class="text-emerald-400/60 text-sm font-medium mb-2 flex items-center gap-2">
                          <span class="w-2 h-2 rounded-full bg-emerald-400/40" />
                          New Token Balance
                        </p>
                        <div class="flex items-baseline gap-2">
                          <p class="text-white text-2xl font-bold tracking-tight">
                            {{ formatTokenAmount(metrics.userNewTokenBalance, metrics.decimals) }}
                          </p>
                          <span class="text-emerald-400/60 text-sm font-medium">{{ newTokenSymbol }}</span>
                        </div>
                      </div>

                      <!-- Revert Stats -->
                      <div class="col-span-1 sm:col-span-2 grid grid-cols-2 gap-4 bg-black/20 rounded-xl p-4 border border-white/5">
                        <div>
                          <p class="text-white/40 text-xs font-medium uppercase tracking-wider mb-1">
                            You Reverted
                          </p>
                          <p class="text-white text-lg font-semibold">
                            {{ formatTokenAmount(metrics.userReverted, metrics.decimals) }} <span class="text-white/30 text-sm">{{ newTokenSymbol }}</span>
                          </p>
                        </div>
                        <div class="border-l border-white/5 pl-4">
                          <p class="text-white/40 text-xs font-medium uppercase tracking-wider mb-1">
                            Total Reverted
                          </p>
                          <p class="text-white text-lg font-semibold">
                            {{ formatTokenAmount(metrics.totalReverted, metrics.decimals) }} <span class="text-white/30 text-sm">{{ newTokenSymbol }}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <!-- Input Section -->
                    <div class="space-y-4">
                      <div class="relative">
                        <div class="flex justify-between items-center mb-2">
                          <label class="text-sm font-medium text-white/80">Amount to revert</label>
                          <span class="text-xs text-white/40">
                            Balance: {{ formatTokenAmount(metrics.userNewTokenBalance, metrics.decimals) }} {{ newTokenSymbol }}
                          </span>
                        </div>

                        <div class="relative group/input">
                          <div class="relative bg-black/60 border border-white/10 rounded-xl flex items-center p-1 focus-within:border-white/20 focus-within:bg-black/80 transition-all">
                            <input
                              v-model="revertAmount"
                              type="text"
                              inputmode="decimal"
                              placeholder="0.00"
                              class="w-full bg-transparent border-none text-white text-2xl font-medium placeholder-white/20 focus:ring-0 focus:outline-none px-4 py-3 appearance-none"
                              min="0"
                              @input="sanitizeRevertAmount"
                            >
                            <div class="flex items-center gap-2 pr-2">
                              <button
                                class="text-xs font-bold bg-white/10 hover:bg-white/20 text-emerald-400 px-3 py-1.5 rounded-lg transition-colors uppercase tracking-wider"
                                @click="setMaxAmount"
                              >
                                Max
                              </button>
                              <div class="bg-white/10 px-3 py-1.5 rounded-lg">
                                <span class="text-white font-medium">{{ newTokenSymbol }}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- Action Buttons -->
                      <div class="grid grid-cols-1 gap-3">
                        <UButton
                          v-if="needsApproval"
                          size="xl"
                          color="neutral"
                          variant="solid"
                          block
                          :loading="isApproving"
                          :disabled="!canApprove"
                          class="h-14 text-base font-bold relative overflow-hidden bg-white text-black hover:bg-white/90"
                          @click="approveTokens"
                        >
                          <span class="relative z-10">Approve Revert</span>
                          <div class="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 opacity-0 hover:opacity-100 transition-opacity" />
                        </UButton>

                        <UButton
                          size="xl"
                          color="neutral"
                          :variant="needsApproval ? 'soft' : 'solid'"
                          block
                          :loading="isReverting"
                          :disabled="!canSubmitRevert"
                          class="h-14 text-base font-bold transition-all duration-300"
                          :class="canSubmitRevert ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/20' : ''"
                          @click="revertTokens"
                        >
                          Revert Tokens
                          <UIcon
                            v-if="!isReverting && !needsApproval"
                            name="i-lucide-arrow-right"
                            class="w-5 h-5 ml-2"
                          />
                        </UButton>
                      </div>

                      <p
                        v-if="amountValidationError"
                        class="text-amber-300/80 text-xs font-medium"
                      >
                        {{ amountValidationError }}
                      </p>

                      <!-- Error Message -->
                      <div
                        v-if="error"
                        class="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3"
                      >
                        <UIcon
                          name="i-lucide-alert-circle"
                          class="w-5 h-5 text-red-400 shrink-0 mt-0.5"
                        />
                        <p class="text-red-400 text-sm font-medium">
                          {{ error }}
                        </p>
                      </div>
                    </div>
                  </div>

                  <!-- Error State -->
                  <div
                    v-else-if="error"
                    class="text-center py-12 px-4"
                  >
                    <div class="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 ring-1 ring-red-500/20">
                      <UIcon
                        name="i-lucide-alert-triangle"
                        class="w-8 h-8 text-red-500"
                      />
                    </div>
                    <h3 class="text-white font-medium text-lg mb-2">
                      Something went wrong
                    </h3>
                    <p class="text-white/40 mb-6 max-w-xs mx-auto text-sm">
                      {{ error }}
                    </p>
                    <UButton
                      color="neutral"
                      variant="solid"
                      class="px-6 bg-white text-black hover:bg-white/90"
                      @click="refreshMetrics"
                    >
                      Try Again
                    </UButton>
                  </div>

                  <!-- Loading State -->
                  <div
                    v-else
                    class="text-center py-20"
                  >
                    <UIcon
                      name="i-lucide-loader-2"
                      class="w-10 h-10 text-emerald-500 animate-spin mx-auto"
                    />
                    <p class="text-white/40 text-sm mt-4 animate-pulse">
                      Loading revert data...
                    </p>
                  </div>
                </div>
              </UCard>
            </div>

            <div class="text-center">
              <p class="text-white/40 text-sm">
                Revert Contract:
                <ClientOnly :fallback="revertContractAddress">
                  <a
                    :href="`${explorerBaseUrl}/address/${revertContractAddress}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-white/60 hover:text-white underline"
                  >
                    {{ shortenAddress(revertContractAddress) }}
                  </a>
                </ClientOnly>
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer class="px-6 lg:px-12 py-6 border-t border-white/10">
        <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/40">
          <p>{{ new Date().getFullYear() }} Morphware. All rights reserved.</p>
          <div class="flex items-center gap-6">
            <a
              href="https://www.morphware.com/privacy-policy"
              target="_blank"
              class="hover:text-white/60 transition-colors"
            >Privacy</a>
            <a
              href="https://www.morphware.com/terms-of-service"
              target="_blank"
              class="hover:text-white/60 transition-colors"
            >Terms</a>
            <a
              href="https://www.morphware.com/contact-us"
              target="_blank"
              class="hover:text-white/60 transition-colors"
            >Support</a>
          </div>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* Chrome, Safari, Edge, Opera */
input[type=number]::-webkit-outer-spin-button,
input[type=number]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Firefox */
input[type=number] {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>
