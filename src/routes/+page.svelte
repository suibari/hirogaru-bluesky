<script>
  import ConcentricGraph from "../components/ConcentricGraph.svelte";
  import 'svelte-material-ui/bare.css'
  import CircularProgress from '@smui/circular-progress';

  export let form;
  let isRunning = false; // フェッチ&描画実行中のフラグ
  
  let elements = [];
  if (form) {
    elements = form.elements;
  }

  function handleSubmit() {
    isRunning = true;
  }
</script>

<form method="post" action="?/generate" on:submit="{handleSubmit}">
  <input type="text" name="handle" autocomplete="off" placeholder="handle.bsky.social" />
  <button type="submit">Generate!</button>
</form>

<!-- <div class="form">
  <Textfield bind:value={handle} label="Handle Name" variant="outlined">
    <Icon class="material-icons" slot="leadingIcon">alternate_email</Icon>
    <HelperText slot="helper">handle.bsky.social</HelperText>
  </Textfield>
  <Button variant="raised">
    <Label>Generate!</Label>
  </Button>
</div> -->

<ConcentricGraph {elements} {isRunning} />

<!-- ローディングスピナー -->
<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
  {#if isRunning}
    <CircularProgress style="height: 60px; width: 60px;" indeterminate />
  {/if}
</div>

<style>
  form {
    margin-top: 8px;
    margin-left: 8px;
    position: relative;
    z-index: 1;
  }
</style>
