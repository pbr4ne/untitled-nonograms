export default class Palette {
    private scene: Phaser.Scene;
    private borderSize: number;
    private colors: number[] = [];
    private colorGraphics: Phaser.GameObjects.Graphics[] = [];
    private highlightGraphics?: Phaser.GameObjects.Graphics;
    private currentColorIndex: number = -1;
    private gapSize: number;
    private cellSize: number;
    private textObject?: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, borderSize: number, gapSize: number, colors: number[], cellSize: number) {
        this.scene = scene;
        this.borderSize = borderSize;
        this.gapSize = gapSize;
        this.colors = colors;
        this.cellSize = cellSize / 2 < 30 ? 30 : cellSize / 2;

        this.drawColorPalette();
    }

    public destroy() {
        this.colorGraphics.forEach(graphics => graphics.destroy());
        this.colorGraphics = [];

        this.highlightGraphics?.destroy();
        this.highlightGraphics = undefined;

        this.textObject?.destroy();
        this.textObject = undefined;
    }

    private drawColorPalette() {
        const cols = Math.ceil(Math.sqrt(this.colors.length));
        const rows = Math.ceil(this.colors.length / cols);

        const totalWidth = cols * this.cellSize + (cols - 1) * this.gapSize;
        const totalHeight = rows * this.cellSize + (rows - 1) * this.gapSize;
    
        const startX = window.innerWidth - totalWidth - this.gapSize - 10;
        const startY = window.innerHeight - totalHeight - this.gapSize - 10;

        this.textObject = this.scene.add.text(startX + totalWidth / 2, startY - this.cellSize / 2, 'Palette', {
            fontSize: `${this.cellSize * 0.5}px`,
            fontFamily: 'Noto Sans Mono',
            color: '#000000',
        }).setOrigin(0.5);

        this.colors.forEach((color, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = startX + col * (this.cellSize + this.gapSize);
            const y = startY + row * (this.cellSize + this.gapSize);

            const paletteGraphics = this.scene.add.graphics()
                .fillStyle(color, 1)
                .fillRect(x, y, this.cellSize, this.cellSize)
                .lineStyle(this.borderSize, 0x000000)
                .strokeRect(x, y, this.cellSize, this.cellSize);

            paletteGraphics.setInteractive(new Phaser.Geom.Rectangle(x, y, this.cellSize, this.cellSize), Phaser.Geom.Rectangle.Contains);
            paletteGraphics.input!.cursor = 'pointer';

            paletteGraphics.on('pointerdown', () => {
                this.currentColorIndex = index;
                this.updateHighlight(x, y, this.cellSize);
            });

            this.colorGraphics.push(paletteGraphics);

            if (index === 0) {
                this.currentColorIndex = 0;
                this.updateHighlight(x, y, this.cellSize);
            }
        });
    }

    public getCurrentColor(): number | null {
        if (this.currentColorIndex >= 0 && this.currentColorIndex < this.colors.length) {
            return this.colors[this.currentColorIndex];
        }
        return null;
    }

    private updateHighlight(x: number, y: number, size: number) {
        this.highlightGraphics?.destroy();

        this.highlightGraphics = this.scene.add.graphics()
            .lineStyle(this.borderSize, 0xffff00, 1)
            .strokeRect(x - this.borderSize / 2, y - this.borderSize / 2, size + this.borderSize, size + this.borderSize);
    }
}
