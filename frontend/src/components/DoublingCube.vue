<template>
  <div class="cube-status">
    Cube: {{ cubeValue }}
    <span>Propriétaire: {{ ownerLabel }}</span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  cubeValue: number;
  cubeOwner: 'user' | 'opponent' | null;
  // Additional props used elsewhere (optional)
  currentValue?: number;
  canDouble?: boolean;
  isPlayerTurn?: boolean;
  playerColor?: 'white' | 'black';
  gameMode?: string;
}

const props = defineProps<Props>();

const ownerLabel = computed(() => {
  if (props.cubeOwner === 'user') return 'Vous';
  if (props.cubeOwner === 'opponent') return 'Adversaire';
  return 'Centre';
});
</script>

<style scoped>
.cube-status {
  font-family: Arial, sans-serif;
  margin: 8px;
}
</style>
