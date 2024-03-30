<script>
  import Confetti from "svelte-confetti";

  const duration = 2000;

  let things = [];
  let timeout;

  export function displayConfetti(x, y, engagement) {
    things = [...things, {x, y, engagement}];

    clearTimeout(timeout);
    timeout = setTimeout(() => things = [], duration);
  }
</script>

{#each things as thing}
  <div class="mover" style="position:absolute; left: {thing.x}px; top: {thing.y}px;">
    <Confetti x={[-0.5, 0.5]} y={[0.25, 1]} amount={thing.engagement} {duration} />
  </div>
{/each}