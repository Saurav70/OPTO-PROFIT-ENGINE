# 3. Mathematical Heuristics & Optimization Engine

## 3.1 The Line Balancing Optimization Loop
At the core of OPTO-PROFIT lies a deterministic, constraint-aware optimization engine executed entirely in client-side JavaScript. This engine dynamically assigns a set of $N$ discrete production tasks to an array of $K$ physical workstations.

The engine relies on a foundational greedy assignment loop:
1. **Candidate Pool Generation**: Identify all eligible tasks whose predecessor dependencies have already been assigned.
2. **Heuristic Sorting**: Sort the candidate pool descendingly using the active heuristic (LTF, MFT, or RPW).
3. **Constraint Validation**: For each sorted candidate, verify that assigning it to the current open workstation satisfies:
   - **Takt Time**: $T_{station} + t_i \le T_{takt}$
   - **Zone Exclusions**: The task’s required physical zone does not conflict with zones already established in the current workstation.
   - **Co-locations & Separations**: User-defined forced groupings or isolation constraints are strictly obeyed.
4. **Assignment**: Assign the first valid task. If no tasks fit, close the current workstation and open $K_{i+1}$.

## 3.2 Implemented Heuristics

### 3.2.1 Longest Task First (LTF)
The LTF heuristic is the simplest and often highly effective approach. It prioritizes tasks with the highest individual execution duration $t_i$. By assigning the most difficult "boulder" tasks first, the algorithm leaves smaller "sand" tasks to easily fill the remaining idle gaps in downstream stations.

### 3.2.2 Most Following Tasks (MFT)
The MFT heuristic prioritizes tasks that act as critical bottlenecks in the Directed Acyclic Graph (DAG) dependency network. Using a Breadth-First Search (BFS) graph traversal, the engine calculates the total transitive count of all successor tasks for every node. Assigning nodes with high successor counts quickly unblocks downstream operations, maintaining a broad candidate pool in later iterations.

### 3.2.3 Ranked Positional Weight (RPW)
The RPW algorithm combines elements of LTF and MFT by assigning a positional weight $W_i$ to each task. The weight is calculated as the sum of the task's own time plus the total time of all its downstream successors.
$$W_i = t_i + \sum_{j \in S_i} t_j$$
Where $S_i$ is the set of all successors of task $i$. RPW is widely considered one of the most robust heuristics for complex line balancing problems.

## 3.3 Key Performance Indicators (KPIs)
The engine instantly evaluates the physical viability of the line using the following standard industrial engineering metrics:

- **Theoretical Minimum Stations ($N_{min}$)**: 
  $$N_{min} = \lceil \frac{\sum t_i}{T_{takt}} \rceil$$
- **Line Efficiency ($\eta$)**: 
  $$\eta = \left( \frac{\sum t_i}{K_{actual} \times T_{cycle}} \right) \times 100$$
- **Balance Delay ($BD$)**: Represents the percentage of time wasted across the line.
  $$BD = 100\% - \eta$$
- **Total Idle Time**: 
  $$I_{total} = (K_{actual} \times T_{cycle}) - \sum t_i$$
- **Smoothness Index ($SI$)**: Indicates the evenness of workload distribution.
  $$SI = \sqrt{ \sum_{k=1}^{K} (T_{cycle_{max}} - T_{cycle_k})^2 }$$

## 3.4 Financial ROI Modeling
Unlike traditional ALBP solvers, OPTO-PROFIT directly translates these theoretical efficiency metrics into actionable financials via a highly customizable formula engine.

The engine calculates daily output projections based on the active bottleneck cycle time ($T_{cycle_{max}}$):
$$Output_{daily} = \min \left( Demand, \lfloor \frac{T_{shift}}{T_{cycle_{max}}} \rfloor \right)$$

This feeds into real-time profitability modeling:
$$Profit_{monthly} = (Output_{daily} \times Days \times (Price_{unit} - Cost_{unit})) - (K_{actual} \times Rate_{hourly} \times \frac{T_{shift}}{60} \times Days)$$

By preserving a **Baseline Snapshot** and comparing it against the live optimization matrix, the engine automatically calculates the profit differential ($\Delta Profit$) and generates capital expenditure payback periods, empowering engineering teams to financially justify layout alterations.
