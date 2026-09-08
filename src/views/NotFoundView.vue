<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const toHomePage = () => router.push('/');
</script>

<template>
   <main>
      <h1>404 - Requested Page Is Not Found !</h1>

      <button v-on:click="toHomePage"></button>
   </main>
</template>
