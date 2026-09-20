<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>

<template>
   <RouterView />

   <Toaster :to="'#toast'" />
   <PromptDialog :to="'#prompt-dialog'" />
   <AlertDialog :to="'#alert-dialog'" />
   <SelectDialog :to="'#select-dialog'" />
</template>
