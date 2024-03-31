<script>
  import Dialog, { Title, Content } from '@smui/dialog';
  let open = false;

  function handleClick() {
    open = true;
  }
</script>

<button on:click={()=>handleClick()}></button>

<Dialog bind:open>

</Dialog>