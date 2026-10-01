/** Give ordinary tables the same column-sizing policy in Chromium and WebKit.
 * Native auto layout distributes spare space differently between the engines.
 * Explicit columns also survive pagination and freezing of wrapped text.
 */
export function sizeTables(root:HTMLElement):void {
  for(const table of root.querySelectorAll('table')) {
    const rows=[...table.rows],count=rows[0]?.cells.length??0;
    // Preserve authored column geometry and complex table structures.
    if(!count || table.parentElement?.closest('table') || table.querySelector('table,colgroup,col') || table.hasAttribute('width') ||
      rows.some(row=>row.cells.length!==count || [...row.cells].some(cell=>cell.colSpan!==1 || cell.rowSpan!==1 || cell.hasAttribute('width'))))continue;
    const available=table.getBoundingClientRect().width;
    if(!available)continue;
    const probe=table.cloneNode(true) as HTMLTableElement;
    probe.classList.add('ps-table-probe');
    table.after(probe);
    const minimum=Array<number>(count).fill(0),preferred=Array<number>(count).fill(0);
    try {
      for(const row of probe.rows) {
        [...row.cells].forEach((cell,index)=>{
          preferred[index]=Math.max(preferred[index],cell.getBoundingClientRect().width);
          cell.classList.add('ps-measure-min');
          minimum[index]=Math.max(minimum[index],cell.getBoundingClientRect().width);
        });
      }
    }finally{probe.remove();}
    // A long URL must not force the entire table beyond the printed page.
    const floor=minimum.map(width=>Math.min(width,available/count));
    const spare=Math.max(0,available-floor.reduce((sum,width)=>sum+width,0));
    const flexibility=preferred.map((width,index)=>Math.max(0,width-floor[index]));
    const total=flexibility.reduce((sum,width)=>sum+width,0);
    // Paged.js omits colgroups on continued pages; put the same widths on
    // every row so each fragment retains its column geometry.
    floor.forEach((width,index)=>{
      const percent=100*(width+spare*(total?flexibility[index]/total:1/count))/available;
      for(const row of rows)row.cells[index].setAttribute('width',`${percent}%`);
    });
    table.classList.add('ps-sized-table');
  }
}
