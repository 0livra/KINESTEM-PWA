import { Container, Graphics, Sprite, AnimatedSprite } from 'pixi.js';
import { CELL_SIZE, GridMatrix } from '../core/grid-matrix';
import {
  CircuitComponentType,
  ComponentVisualState,
  COMPONENT_METADATA,
} from '../core/circuit-types';

export interface ComponentNodeOptions {
  type: CircuitComponentType;
  col: number;
  row: number;
  cellSize?: number;
  matrix?: GridMatrix;
}

/**
 * Patrón Contenedor Ancla (Anchor Container Pattern)
 * Desacopla la lógica espacial y eventos de red de la representación visual intercambiable.
 * Soporta transición fluida desde Whiteboxing procedural hasta Skinning final (Sprites/Atlas).
 */
export class ElectronicComponentNode extends Container {
  public readonly componentType: CircuitComponentType;
  public col: number;
  public row: number;
  public readonly cellSize: number;
  public visualState: ComponentVisualState = 'idle';

  // Capa visual desacoplada de los listeners
  private visualLayer: Container;
  private whiteboxGraphics: Graphics | null = null;
  private skinSprite: Sprite | AnimatedSprite | null = null;

  constructor(options: ComponentNodeOptions) {
    super();

    this.componentType = options.type;
    this.col = options.col;
    this.row = options.row;
    this.cellSize = options.cellSize ?? CELL_SIZE;

    // Configuración del ancla centralizada (0.5 respecto al tamaño de la celda)
    this.updateGridPosition(this.col, this.row);

    // Contenedor visual interno
    this.visualLayer = new Container();
    this.addChild(this.visualLayer);

    // Habilitar interacción sobre el contenedor ancla (los listeners se mantienen intactos al cambiar de skin)
    this.eventMode = 'static';
    this.cursor = 'pointer';

    // Inicializar visualización por defecto en fase Whiteboxing
    this.initWhitebox();
  }

  /**
   * Actualiza las coordenadas espaciales centrando el nodo según la matriz lógica
   */
  public updateGridPosition(col: number, row: number): void {
    this.col = col;
    this.row = row;
    this.position.set(
      col * this.cellSize + this.cellSize * 0.5,
      row * this.cellSize + this.cellSize * 0.5
    );
  }

  /**
   * Inicializa la fase Whiteboxing mediante gráficos procedurales
   */
  private initWhitebox(): void {
    if (this.skinSprite) {
      this.visualLayer.removeChild(this.skinSprite);
      this.skinSprite.destroy();
      this.skinSprite = null;
    }

    if (!this.whiteboxGraphics) {
      this.whiteboxGraphics = new Graphics();
      this.visualLayer.addChild(this.whiteboxGraphics);
    }

    this.renderWhiteboxShape();
  }

  /**
   * Dibuja la geometría procedural centrada en el origen local (0, 0)
   */
  private renderWhiteboxShape(): void {
    if (!this.whiteboxGraphics) return;

    const metadata = COMPONENT_METADATA[this.componentType];
    const color = metadata.colorScheme[this.visualState];
    const halfSize = (this.cellSize * 0.8) / 2;

    this.whiteboxGraphics.clear();

    // Fondo geométrico representativo
    this.whiteboxGraphics.roundRect(-halfSize, -halfSize, halfSize * 2, halfSize * 2, 8);
    this.whiteboxGraphics.fill({ color, alpha: 0.85 });
    this.whiteboxGraphics.stroke({ width: 3, color: 0xffffff, alpha: 0.9 });

    // Pines de conexión laterales
    const pinLength = this.cellSize * 0.15;
    this.whiteboxGraphics.moveTo(-halfSize - pinLength, 0);
    this.whiteboxGraphics.lineTo(-halfSize, 0);
    this.whiteboxGraphics.moveTo(halfSize, 0);
    this.whiteboxGraphics.lineTo(halfSize + pinLength, 0);
    this.whiteboxGraphics.stroke({ width: 4, color: 0x94a3b8 });
  }

  /**
   * Método de control de estado: altera colores en Whiteboxing o tint/frames en Skinning
   */
  public setState(state: ComponentVisualState): void {
    this.visualState = state;

    if (this.skinSprite) {
      // Fase Skinning: actualiza la textura, animación o tinte sin tocar listeners
      const metadata = COMPONENT_METADATA[this.componentType];
      this.skinSprite.tint = metadata.colorScheme[state];
      if (this.skinSprite instanceof AnimatedSprite && state === 'warning') {
        this.skinSprite.play();
      }
    } else {
      // Fase Whiteboxing: redibuja los gráficos procedurales
      this.renderWhiteboxShape();
    }
  }

  /**
   * Fase Skinning: Sustituye la capa visual por un Sprite o AnimatedSprite
   * preservando íntegramente la posición del ancla y los listeners de red del contenedor padre.
   */
  public applySkin(sprite: Sprite | AnimatedSprite): void {
    if (this.whiteboxGraphics) {
      this.visualLayer.removeChild(this.whiteboxGraphics);
      this.whiteboxGraphics.destroy();
      this.whiteboxGraphics = null;
    }

    if (this.skinSprite) {
      this.visualLayer.removeChild(this.skinSprite);
      this.skinSprite.destroy();
    }

    this.skinSprite = sprite;
    // Anclaje al centro del Sprite
    this.skinSprite.anchor?.set(0.5, 0.5);
    this.visualLayer.addChild(this.skinSprite);

    // Aplicar estado visual vigente al nuevo skin
    this.setState(this.visualState);
  }

  /**
   * Permite revertir de Skinning a Whiteboxing procedural en tiempo de ejecución
   */
  public revertToWhitebox(): void {
    this.initWhitebox();
    this.setState(this.visualState);
  }
}
