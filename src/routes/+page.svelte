<script>
  import ConcentricGraph from "../components/ConcentricGraph.svelte";
  export let form;
</script>

<form method="post" action="?/generate">
  <input type="text" name="handle" autocomplete="off" placeholder="handle.bsky.social" />
  <button type="submit">Generate!</button>
</form>

{#if form}
  <ConcentricGraph elements={form.elements}/>
{/if}