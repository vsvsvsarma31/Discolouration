export type Grid = boolean[][];
export type CellPosition = [row: number, column: number];

export interface SolutionResult {
  minMoves: number;
  clickPositions: CellPosition[];
}

const coefficientCache = new Map<number, bigint[]>();

function validateSquareGrid(grid: Grid) {
  if (grid.length === 0) {
    throw new Error('Grid must contain at least one row.');
  }

  const size = grid.length;

  for (const row of grid) {
    if (row.length !== size) {
      throw new Error('Grid must be square.');
    }
  }
}

function buildCoefficientRows(size: number) {
  const rows: bigint[] = [];

  for (let index = 0; index < size * size; index += 1) {
    const row = Math.floor(index / size);
    const column = index % size;
    let bits = 0n;

    for (const [deltaRow, deltaColumn] of [
      [0, 0],
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const nextRow = row + deltaRow;
      const nextColumn = column + deltaColumn;

      if (nextRow >= 0 && nextRow < size && nextColumn >= 0 && nextColumn < size) {
        bits |= 1n << BigInt(nextRow * size + nextColumn);
      }
    }

    rows.push(bits);
  }

  return rows;
}

function getCoefficientRows(size: number) {
  const cached = coefficientCache.get(size);

  if (cached) {
    return cached;
  }

  const rows = buildCoefficientRows(size);
  coefficientCache.set(size, rows);
  return rows;
}

function buildTargetVector(grid: Grid) {
  const size = grid.length;
  const target = new Uint8Array(size * size);

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      target[row * size + column] = grid[row][column] ? 0 : 1;
    }
  }

  return target;
}

export function solveLightsOut(grid: Grid): SolutionResult | null {
  validateSquareGrid(grid);

  const size = grid.length;
  const totalCells = size * size;
  const rows = [...getCoefficientRows(size)];
  const rightHandSide = buildTargetVector(grid);
  const pivotColumns: number[] = [];

  let pivotRow = 0;

  for (let column = 0; column < totalCells && pivotRow < totalCells; column += 1) {
    const mask = 1n << BigInt(column);
    let swapRow = pivotRow;

    while (swapRow < totalCells && (rows[swapRow] & mask) === 0n) {
      swapRow += 1;
    }

    if (swapRow === totalCells) {
      continue;
    }

    if (swapRow !== pivotRow) {
      [rows[pivotRow], rows[swapRow]] = [rows[swapRow], rows[pivotRow]];
      [rightHandSide[pivotRow], rightHandSide[swapRow]] = [
        rightHandSide[swapRow],
        rightHandSide[pivotRow],
      ];
    }

    pivotColumns.push(column);

    for (let row = 0; row < totalCells; row += 1) {
      if (row !== pivotRow && (rows[row] & mask) !== 0n) {
        rows[row] ^= rows[pivotRow];
        rightHandSide[row] ^= rightHandSide[pivotRow];
      }
    }

    pivotRow += 1;
  }

  for (let row = pivotRow; row < totalCells; row += 1) {
    if (rows[row] === 0n && rightHandSide[row] === 1) {
      return null;
    }
  }

  const pivotSet = new Set(pivotColumns);
  const freeColumns: number[] = [];

  for (let column = 0; column < totalCells; column += 1) {
    if (!pivotSet.has(column)) {
      freeColumns.push(column);
    }
  }

  if (freeColumns.length > 20) {
    throw new Error(
      `Expected at most 20 free variables, received ${freeColumns.length}.`,
    );
  }

  let bestMoves = Number.POSITIVE_INFINITY;
  let bestSolution = 0n;
  const totalAssignments = 2 ** freeColumns.length;

  for (let assignment = 0; assignment < totalAssignments; assignment += 1) {
    const solution = new Uint8Array(totalCells);

    for (let index = 0; index < freeColumns.length; index += 1) {
      if ((assignment & (1 << index)) !== 0) {
        solution[freeColumns[index]] = 1;
      }
    }

    for (let index = pivotColumns.length - 1; index >= 0; index -= 1) {
      const pivotColumn = pivotColumns[index];
      let value = rightHandSide[index];
      let dependencies = rows[index] >> BigInt(pivotColumn + 1);
      let column = pivotColumn + 1;

      while (dependencies !== 0n) {
        if ((dependencies & 1n) === 1n) {
          value ^= solution[column];
        }

        dependencies >>= 1n;
        column += 1;
      }

      solution[pivotColumn] = value;
    }

    let moveCount = 0;
    let encodedSolution = 0n;

    for (let index = 0; index < totalCells; index += 1) {
      if (solution[index] === 1) {
        moveCount += 1;
        encodedSolution |= 1n << BigInt(index);
      }
    }

    if (moveCount < bestMoves) {
      bestMoves = moveCount;
      bestSolution = encodedSolution;
    }
  }

  const clickPositions: CellPosition[] = [];

  for (let index = 0; index < totalCells; index += 1) {
    if ((bestSolution & (1n << BigInt(index))) !== 0n) {
      clickPositions.push([Math.floor(index / size), index % size]);
    }
  }

  return {
    minMoves: bestMoves,
    clickPositions,
  };
}
