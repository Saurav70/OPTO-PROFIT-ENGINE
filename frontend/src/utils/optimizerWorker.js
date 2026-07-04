import { runOptimization } from './optimizer';

self.onmessage = (e) => {
  try {
    const { tasks, cycleTime, heuristic, config } = e.data;
    const result = runOptimization(tasks, cycleTime, heuristic, config);
    self.postMessage({ type: 'SUCCESS', result });
  } catch (error) {
    self.postMessage({ type: 'ERROR', error: error.message });
  }
};
