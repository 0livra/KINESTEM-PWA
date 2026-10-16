/**
 * KINESTEM Engine - Matriz Lógica 2D
 * Define el sistema coordenado espacial de la placa de circuitos STEM
 */

export const CELL_SIZE = 64; // Tamaño estándar en píxeles por celda

export interface GridCoord {
  col: number;
  row: number;
}

export interface PixelCoord {
  x: number;
  y: number;
}

export class GridMatrix {
  public readonly cols: number;
  public readonly rows: number;
  public readonly cellSize: number;

  constructor(cols = 10, rows = 8, cellSize = CELL_SIZE) {
    this.cols = cols;
    this.rows = rows;
    this.cellSize = cellSize;
  }

  /**
   * Convierte coordenadas de celda (col, row) a posición en píxeles centrada (anchor 0.5)
   */
  public gridToPixel(col: number, row: number): PixelCoord {
    return {
      x: col * this.cellSize + this.cellSize * 0.5,
      y: row * this.cellSize + this.cellSize * 0.5,
    };
  }

  /**
   * Convierte píxeles de pantalla a celda lógica más cercana
   */
  public pixelToGrid(x: number, y: number): GridCoord {
    return {
      col: Math.floor(x / this.cellSize),
      row: Math.floor(y / this.cellSize),
    };
  }

  /**
   * Verifica si una coordenada lógica se encuentra dentro de los límites de la matriz
   */
  public isWithinBounds(col: number, row: number): boolean {
    return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
  }
}
