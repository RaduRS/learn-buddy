// Offline board authoring tool. No generation or solver runs in the browser.
// c++ -O3 -std=c++17 scripts/generate-light-links.cpp -o /tmp/generate-light-links
// /tmp/generate-light-links > lib/games/lightLinksBoards.ts
// --verify accepts size/pair-count/(route-length route-cells...) from standard input.
// Seeds: 20261110 for Easy through Master, 20261119 for Legend.
// Full generation takes a few minutes; --verify checks an existing bank quickly.
// Each accepted endpoint layout has exactly one full-grid solution. A search
// that exceeds the node budget is rejected, never treated as proof of uniqueness.
#include <algorithm>
#include <array>
#include <iostream>
#include <numeric>
#include <random>
#include <set>
#include <sstream>
#include <string>
#include <vector>
using Path = std::vector<int>;
using Puzzle = std::vector<Path>;
using Pack = std::vector<Puzzle>;
std::mt19937 randomEngine(20261110);
int randomInt(int n) { return std::uniform_int_distribution<int>(0, n - 1)(randomEngine); }

const std::array<Pack, 6> originals = {{
{{{4, 0, 1}, {6, 2, 3}, {5, 9, 10}, {7, 11, 15, 14, 13, 12, 8}}, {{10, 11, 15}, {14, 13, 12, 8}, {7, 6, 5, 9}, {4, 0, 1, 2, 3}}, {{15, 14}, {2, 3, 7, 11}, {4, 0, 1, 5, 6}, {13, 12, 8, 9, 10}}},
{{{11, 6, 7, 8, 13, 18, 23}, {5, 10, 15, 20}, {12, 17, 22, 21, 16}, {24, 19}, {14, 9, 4, 3, 2, 1, 0}}, {{16, 21, 20, 15, 10, 5, 0}, {7, 8, 13}, {22, 23, 24, 19, 14, 9}, {4, 3, 2, 1, 6, 11, 12}, {18, 17}}, {{16, 15, 20, 21, 22}, {17, 12, 11, 10, 5, 0, 1}, {2, 3, 8, 13, 18}, {23, 24, 19, 14, 9, 4}, {6, 7}}},
{{{3, 2, 1, 0, 6, 7, 8, 14, 20}, {11, 5, 4, 10, 16, 22}, {27, 21, 15, 9}, {35, 29, 23, 17}, {13, 19, 25, 26}, {28, 34, 33, 32, 31, 30, 24, 18, 12}}, {{8, 2, 3}, {6, 0, 1, 7, 13, 14, 15}, {23, 22, 28}, {16, 17, 11, 5, 4, 10, 9}, {27, 21, 20, 19, 18, 12}, {31, 30, 24, 25, 26, 32, 33, 34, 35, 29}}, {{19, 13, 7, 8}, {28, 22, 16, 15, 9, 10}, {3, 2, 1, 0, 6, 12, 18}, {29, 23, 17, 11, 5, 4}, {26, 25, 24, 30, 31, 32, 33, 34, 35}, {14, 20, 21, 27}}},
{{{3, 4, 5, 6, 13, 12}, {36, 29, 28, 21, 14, 7, 0, 1, 2}, {9, 8, 15, 22}, {33, 34, 41, 48, 47, 40, 39, 38, 37, 30}, {46, 45, 44, 43, 42, 35}, {23, 16, 17, 24, 31, 32}, {19, 20, 27, 26, 25, 18, 11, 10}}, {{15, 22, 29, 36, 37, 38, 39, 40, 33}, {18, 17, 16, 9, 10, 3, 2, 1, 0, 7, 8}, {34, 41, 48, 47, 46, 45}, {32, 31, 30, 23}, {44, 43, 42, 35, 28, 21, 14}, {24, 25, 26, 19, 12, 11}, {4, 5, 6, 13, 20, 27}}, {{35, 42, 43, 44, 45, 46, 47}, {34, 27, 20, 13, 6, 5, 4}, {48, 41, 40, 39, 38, 37, 36, 29, 22}, {32, 25, 18, 17, 24}, {15, 8, 9, 10, 3, 2, 1, 0, 7, 14, 21, 28}, {11, 12, 19, 26, 33}, {31, 30, 23, 16}}},
{},
{}
}};

struct Grid {
  int size, area;
  std::vector<Path> neighbours;
  Grid(int n): size(n), area(n*n), neighbours(area) {
    for (int i=0; i<area; ++i) {
      if (i>=n) neighbours[i].push_back(i-n);
      if (i+n<area) neighbours[i].push_back(i+n);
      if (i%n) neighbours[i].push_back(i-1);
      if (i%n<n-1) neighbours[i].push_back(i+1);
    }
  }
  int distance(int a,int b) const { return abs(a/size-b/size)+abs(a%size-b%size); }
  int transform(int cell,int symmetry) const {
    int row=cell/size,col=cell%size;
    if (symmetry>=4) col=size-1-col;
    for(int k=0;k<symmetry%4;++k) { int oldRow=row; row=col; col=size-1-oldRow; }
    return row*size+col;
  }
  std::string signature(const Puzzle &puzzle) const {
    std::string best;
    for(int symmetry=0;symmetry<8;++symmetry) {
      std::vector<std::pair<int,int>> pairs;
      for(const auto &route:puzzle) {
        int a=transform(route.front(),symmetry),b=transform(route.back(),symmetry);
        pairs.emplace_back(std::min(a,b),std::max(a,b));
      }
      std::sort(pairs.begin(),pairs.end());
      std::ostringstream out;
      for(auto [a,b]:pairs) out << a << ':' << b << ';';
      if(symmetry==0 || out.str()<best) best=out.str();
    }
    return best;
  }
};

struct Solver {
  const Grid &grid;
  std::array<bool,81> available{};
  std::array<int,20> heads{};
  int pairs, empty, nodes=0, budget;
  bool timedOut=false;
  Solver(const Grid &g,const Puzzle &p,int limit=200000): grid(g),pairs(p.size()),empty(g.area-2*p.size()),budget(limit) {
    std::fill(available.begin(),available.begin()+g.area,true);
    heads.fill(-1);
    for(int i=0;i<pairs;++i) {
      heads[2*i]=p[i].front(); heads[2*i+1]=p[i].back();
      available[heads[2*i]]=available[heads[2*i+1]]=false;
    }
  }
  bool reachable(int a,int b) const {
    std::array<bool,81> seen{};
    std::array<int,81> queue{};
    int start=0,end=1;queue[0]=a;seen[a]=true;
    while(start<end) for(int cell:grid.neighbours[queue[start++]]) {
      if(cell==b) return true;
      if(available[cell]&&!seen[cell]) { seen[cell]=true;queue[end++]=cell; }
    }
    return false;
  }
  int search() {
    if(++nodes>budget) { timedOut=true;return 0; }
    std::array<bool,81> active{};
    int selected=-1,minOptions=5;
    Path moves;
    for(int h=0;h<pairs*2;++h) if(heads[h]>=0) {
      active[heads[h]]=true;
      Path options;
      for(int cell:grid.neighbours[heads[h]]) if(available[cell]||cell==heads[h^1]) options.push_back(cell);
      if(options.empty()) return 0;
      if((int)options.size()<minOptions) { selected=h; minOptions=options.size(); moves=options; }
    }
    if(selected<0) return empty==0;
    // Every unfilled square eventually needs two incident route edges.
    for(int cell=0;cell<grid.area;++cell) if(available[cell]) {
      int degree=0;
      for(int neighbour:grid.neighbours[cell]) degree+=available[neighbour]||active[neighbour];
      if(degree<2) return 0;
    }
    // Paths cannot recover if another route has cut their two ends apart.
    for(int pair=0;pair<pairs;++pair) if(heads[pair*2]>=0&&!reachable(heads[pair*2],heads[pair*2+1])) return 0;
    int total=0, previous=heads[selected],target=heads[selected^1];
    for(int move:moves) {
      if(move==target) {
        heads[selected]=heads[selected^1]=-1;
        total+=search();
        heads[selected]=previous;heads[selected^1]=target;
      } else {
        heads[selected]=move; available[move]=false; --empty;
        total+=search();
        heads[selected]=previous; available[move]=true; ++empty;
      }
      if(total>=2||timedOut) break;
    }
    return total;
  }
};

Path randomHamiltonianPath(const Grid &grid) {
  Path path(grid.area);
  for(int i=0;i<grid.area;++i) path[i]=i/grid.size*grid.size+(i/grid.size%2 ? grid.size-1-i%grid.size : i%grid.size);
  // Backbite moves preserve a Hamiltonian path while changing its geometry.
  for(int iteration=0;iteration<grid.area*24;++iteration) {
    bool front=randomInt(2)==0;
    int endpoint=front?path.front():path.back();
    int next=grid.neighbours[endpoint][randomInt(grid.neighbours[endpoint].size())];
    int index=std::find(path.begin(),path.end(),next)-path.begin();
    if(front) std::reverse(path.begin(),path.begin()+index);
    else std::reverse(path.begin()+index+1,path.end());
  }
  return path;
}

Puzzle partition(const Grid &grid,const Path &path) {
  int n=grid.size;
  int pairCount=n==9?10:n;
  Path lengths(pairCount,grid.area/pairCount);
  for(int extra=0;extra<grid.area%pairCount;++extra) ++lengths[extra];
  int minimum=n<6?2:n==9?4:n-3;
  for(int i=0;i<n*5;++i) {
    int from=randomInt(pairCount),to=randomInt(pairCount);
    if(from!=to&&lengths[from]>minimum) { --lengths[from];++lengths[to]; }
  }
  Puzzle puzzle;
  int offset=0;
  for(int length:lengths) {
    puzzle.emplace_back(path.begin()+offset,path.begin()+offset+length);
    offset+=length;
  }
  return puzzle;
}

bool interesting(const Grid &grid,const Puzzle &puzzle) {
  int turns=0,detour=0,longest=0,adjacent=0;
  for(const auto &route:puzzle) {
    int distance=grid.distance(route.front(),route.back());
    if(distance==1) ++adjacent;
    if(distance==1&&route.size()>2) return false;
    detour+=route.size()-1-distance;
    longest=std::max(longest,(int)route.size());
    for(int i=1;i+1<(int)route.size();++i) turns+=(route[i]-route[i-1])!=(route[i+1]-route[i]);
  }
  int n=grid.size;
  if(n>=6&&adjacent) return false;
  if(n>=6&&longest<n+3) return false;
  return turns>=2*n-4 && detour>=std::max(0,2*n-8);
}

void printPuzzle(const Puzzle &puzzle) {
  std::cout << "    [";
  for(size_t j=0;j<puzzle.size();++j) {
    if(j) std::cout << ", ";
    std::cout << '[';
    for(size_t i=0;i<puzzle[j].size();++i) { if(i)std::cout << ", "; std::cout << puzzle[j][i]; }
    std::cout << ']';
  }
  std::cout << "],\n";
}

// Grow two new routes into verified Master layouts using legal endpoint transfers.
// Neither added route remains a straight border filler; both bend and together
// have at least three turns. Every final layout is independently solved again.
Pack generateLegend(const Pack &masterSeeds) {
  randomEngine.seed(20261119);
  Grid grid(9);std::set<std::string> signatures;
  Pack pack;
  for(int attempt=0,accepted=0;accepted<24;++attempt) {
    auto source=masterSeeds[randomInt(masterSeeds.size())];
    Puzzle p;
    for(auto route:source) { for(int &cell:route)cell=cell/8*9+cell%8; p.push_back(route); }
    p.push_back({8,17,26,35,44,53,62,71});
    p.push_back({80,79,78,77,76,75,74,73,72});
    int moves=0,lastCell=-1;
    for(int i=0;i<50;++i) {
      std::vector<std::array<int,4>> options;
      for(int a=0;a<10;++a)if(p[a].size()>4)for(int b=0;b<10;++b)if(a!=b)
        for(int ar=0;ar<2;++ar)for(int br=0;br<2;++br) {
          int ac=ar?p[a].front():p[a].back(),bc=br?p[b].front():p[b].back();
          if(ac!=lastCell&&grid.distance(ac,bc)==1) options.push_back({a,b,ar,br});
        }
      if(options.empty()) break;
      auto [a,b,ar,br]=options[randomInt(options.size())];
      if(ar)std::reverse(p[a].begin(),p[a].end());
      if(br)std::reverse(p[b].begin(),p[b].end());
      lastCell=p[a].back();p[b].push_back(lastCell);p[a].pop_back();++moves;
    }
    auto turns=[](const Path &r) {int result=0;for(int i=1;i+1<(int)r.size();++i)result+=(r[i]-r[i-1])!=(r[i+1]-r[i]);return result;};
    if(moves<50||!interesting(grid,p)||turns(p[8])<1||turns(p[9])<1||turns(p[8])+turns(p[9])<3)continue;
    auto key=grid.signature(p);if(signatures.count(key))continue;
    Solver solver(grid,p,20000);
    if(solver.search()!=1||solver.timedOut)continue;
    signatures.insert(key);++accepted;
    std::cerr << "Mutator "<<accepted<<" at "<<attempt<<", "<<moves<<" moves, "<<solver.nodes<<" nodes\n";
    pack.push_back(p);
  }
  return pack;
}

int main(int argc, char **argv) {
  // Verification input: size, pair count, then (route length, route cells) per pair.
  if (argc > 1) {
    if (std::string(argv[1]) != "--verify") return 1;
    int size, pairs, verified = 0;
    while (std::cin >> size >> pairs) {
      if (size < 2 || size > 9 || pairs < 1 || pairs > 10) return 1;
      Grid grid(size);
      Puzzle puzzle;
      std::set<int> occupied;
      for (int pair = 0; pair < pairs; ++pair) {
        int length;
        if (!(std::cin >> length) || length < 2 || length > grid.area) return 1;
        Path route(length);
        for (int index = 0; index < length; ++index) {
          int &cell = route[index];
          if (!(std::cin >> cell) || cell < 0 || cell >= grid.area || !occupied.insert(cell).second) return 1;
          if (index && grid.distance(cell, route[index - 1]) != 1) return 1;
        }
        puzzle.push_back(route);
      }
      if (occupied.size() != static_cast<size_t>(grid.area)) return 1;
      Solver solver(grid, puzzle, 2000000);
      if (solver.search() != 1 || solver.timedOut) return 1;
      ++verified;
    }
    std::cout << "Verified " << verified << " full-grid, unique-solution boards\n";
    return verified ? 0 : 1;
  }
  Pack masterSeeds;
  std::cout << "// Authored offline with scripts/generate-light-links.cpp (seed 20261110).\n"
            << "// Each endpoint layout has one full-grid solution, with no duplicates under\n"
            << "// rotation, reflection, endpoint reversal or pair renumbering.\n"
            << "export const LIGHT_LINKS_BOARDS: Readonly<Record<number, readonly (readonly (readonly number[])[])[]>> = {\n";
  for(int size=4;size<=9;++size) {
    Grid grid(size);
    Pack pack=size==9 ? generateLegend(masterSeeds) : originals[size-4];
    std::set<std::string> signatures;
    for(const auto &puzzle:pack) signatures.insert(grid.signature(puzzle));
    int attempts=0,maxNodes=0;
    while(pack.size()<24) {
      auto path=randomHamiltonianPath(grid);
      for(int split=0;split<8&&pack.size()<24;++split) {
        ++attempts;
        if(attempts%100000==0) std::cerr << "Tried " << attempts << " candidates for " << size << "x" << size << "\n";
        auto puzzle=partition(grid,path);
        if(!interesting(grid,puzzle)) continue;
        auto signature=grid.signature(puzzle);
        if(signatures.count(signature)) continue;
        Solver solver(grid,puzzle,size==9?20000:200000);
        if(solver.search()!=1||solver.timedOut) continue;
        std::shuffle(puzzle.begin(),puzzle.end(),randomEngine);
        if(size==4) std::stable_sort(puzzle.begin(),puzzle.end(),[](const auto &a,const auto &b){ return a.size()<b.size(); });
        signatures.insert(signature); pack.push_back(puzzle);
        maxNodes=std::max(maxNodes,solver.nodes);
        std::cerr << size << "x" << size << ": " << pack.size() << "/24 (" << attempts << " candidates, " << solver.nodes << " search nodes)\n";
      }
    }
    if(size==8) masterSeeds=pack;
    // Check every original as well as generated board with the same exhaustive solver.
    for(const auto &puzzle:pack) {
      Solver solver(grid,puzzle,2000000);
      if(solver.search()!=1||solver.timedOut) { std::cerr << "Uniqueness validation failed\n";return 1; }
    }
    std::cout << "  " << size << ": [\n";
    for(const auto &puzzle:pack) printPuzzle(puzzle);
    std::cout << "  ],\n" << std::flush;
    std::cerr << "Verified " << size << "x" << size << " pack, max search nodes " << maxNodes << "\n";
  }
  std::cout << "};\n";
  return 0;
}
