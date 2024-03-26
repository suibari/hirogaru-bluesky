export default [
  {
    selector: 'node',
    style: {
      'width': 'data(rank)',
      'height': 'data(rank)',
      'background-fit': 'contain',
      'background-image': 'data(img)',
    },
  },
  {
    selector: 'edge',
    style: {
      'width': 'data(engagement)',
      'display': 'none',
      'curve-style': 'unbundled-bezier',
      'target-arrow-shape': 'triangle',
      'line-color': 'white',
      'target-arrow-color': 'white',
    },
  },
  {
    selector: 'node[level=0]',
    style: {
      'display': 'none',
    }
  }
]