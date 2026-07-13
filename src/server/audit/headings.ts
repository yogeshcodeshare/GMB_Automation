import type { HeadingNode } from "@/types";

/** Build the H1–H6 tree + skip list from a flat heading sequence (shared by
 * the fixture parser and the M1.5 crawler). A node is `skip_flag`ged when it
 * sits more than one level below its parent (e.g. H5 directly under H2). */
export function buildHeadingTree(
  sequence: Array<{ level: HeadingNode["level"]; text: string }>
): { headings: HeadingNode[]; skips: string[] } {
  const roots: HeadingNode[] = [];
  const stack: HeadingNode[] = [];
  const skips: string[] = [];
  for (const { level, text } of sequence) {
    const node: HeadingNode = { level, text, skip_flag: false, children: [] };
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }
    const parent = stack[stack.length - 1];
    if (parent) {
      node.skip_flag = level > parent.level + 1;
      if (node.skip_flag) {
        const skip = `H${parent.level}→H${level}`;
        if (!skips.includes(skip)) skips.push(skip);
      }
      parent.children.push(node);
    } else {
      node.skip_flag = level > 1 && roots.length === 0;
      roots.push(node);
    }
    stack.push(node);
  }
  return { headings: roots, skips };
}
