import { StateGraph, END, Annotation } from '@langchain/langgraph';

const GraphSchema = Annotation.Root({
  input: Annotation<string>,
  output: Annotation<string>({ default: () => '', value: (left, right) => right })
});

export function createTestGraph() {
  const workflow = new StateGraph(GraphSchema as any);
  
  workflow.addNode('process', (state: any) => ({
    output: `Processed: ${state.input}`
  }));
  
  (workflow as any).addEdge('__start__', 'process');
  (workflow as any).addEdge('process', '__end__');
  
  return workflow.compile();
}