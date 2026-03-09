<script setup>
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: 'https://framerusercontent.com/images/0wJIpnHR4fliia1jeMqNRxw13k.png' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'Morphware XMW Migration'
const description = 'Migrate your XMW tokens from old contract to new contract at 1:1 ratio.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: '/xmw-og.png',
  twitterImage: '/xmw-og.png',
  twitterCard: 'summary_large_image',
  icon: 'https://framerusercontent.com/images/0wJIpnHR4fliia1jeMqNRxw13k.png'
})
</script>

<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>
