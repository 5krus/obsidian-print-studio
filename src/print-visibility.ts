/** Remove screen-only descendants before print transformations can discard their classes. */
export function removePrintHiddenContent(root:ParentNode):void {
  root.querySelectorAll('.print-hide').forEach(element=>element.remove());
}
