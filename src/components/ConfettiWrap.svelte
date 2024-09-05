<script>
  import Confetti from "svelte-confetti";

  const DURATION = 2000;
  const MAX_AMOUNT = (500 - 50) / 3;

  let things = [];
  let timeout;

  export function displayConfetti(x, y, engagement) {
    things = [...things, {x, y, engagement}];

    clearTimeout(timeout);
    timeout = setTimeout(() => things = [], DURATION);
  }
</script>

{#each things as thing}
  {#if thing.engagement > 0}
    <div class="mover" style="position:absolute; left: {thing.x}px; top: {thing.y}px;">
      <Confetti
        x={[-0.5, 0.5]}
        delay={[0, 250]}
        amount={Math.min(thing.engagement/3, MAX_AMOUNT)}
        duration={DURATION} />
      <Confetti
        x={[-0.75, -0.3]}
        y={[0.15, 0.75]}
        amount={Math.min(thing.engagement/3, MAX_AMOUNT)}
        duration={DURATION} />
      <Confetti
        x={[0.3, 0.75]}
        y={[0.15, 0.75]}
        amount={Math.min(thing.engagement/3, MAX_AMOUNT)}
        duration={DURATION} />  
    </div>
  {/if}
{/each}