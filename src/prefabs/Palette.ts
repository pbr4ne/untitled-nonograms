export default class Palette {
    private scene: Phaser.Scene;
    private borderSize: number;
    private colors: number[] = [];
    private colorGraphics: Phaser.GameObjects.Graphics[] = [];
    private highlightGraphics?: Phaser.GameObjects.Graphics;
    private currentColorIndex: number = -1;
    private gapSize: number;

    constructor(scene: Phaser.Scene, borderSize: number, gapSize: number) {
        this.scene = scene;
        this.borderSize = borderSize;
        this.gapSize = gapSize;
    }

    drawColorPalette(colors: number[], cellSize: number) {
        this.colors = colors;

        const cols = Math.ceil(Math.sqrt(colors.length));
        const rows = Math.ceil(colors.length / cols);

        const totalWidth = cols * cellSize + (cols - 1) * this.gapSize;
        const totalHeight = rows * cellSize + (rows - 1) * this.gapSize;
        const startX = (this.scene.sys.game.config.width as number) - totalWidth - this.gapSize - 10;
        const startY = (this.scene.sys.game.config.height as number) - totalHeight - this.gapSize - 10;

        const textX = startX + totalWidth / 2;
        const textY = startY - cellSize;
        this.scene.add.text(textX, textY, 'Palette', {
            fontSize: `${cellSize * 0.6}px`,
            fontFamily: 'Noto Sans Mono',
            color: '#000000',
        }).setOrigin(0.5);

        colors.forEach((color, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = startX + col * (cellSize + this.gapSize);
            const y = startY + row * (cellSize + this.gapSize);

            const paletteGraphics = this.scene.add.graphics()
                .fillStyle(color, 1)
                .fillRect(x, y, cellSize, cellSize)
                .lineStyle(this.borderSize, 0x000000)
                .strokeRect(x, y, cellSize, cellSize);

            paletteGraphics.setInteractive(new Phaser.Geom.Rectangle(x, y, cellSize, cellSize), Phaser.Geom.Rectangle.Contains);
            paletteGraphics.input!.cursor = 'pointer';

            paletteGraphics.on('pointerdown', () => {
                this.currentColorIndex = index;
                this.updateHighlight(x, y, cellSize);
            });

            this.colorGraphics.push(paletteGraphics);

            if (index === 0) {
                this.currentColorIndex = 0;
                this.updateHighlight(x, y, cellSize);
            }
        });
    }

    getCurrentColor(): number | null {
        if (this.currentColorIndex >= 0 && this.currentColorIndex < this.colors.length) {
            return this.colors[this.currentColorIndex];
        }
        return null;
    }

    private updateHighlight(x: number, y: number, size: number) {
        if (this.highlightGraphics) {
            this.highlightGraphics.destroy();
        }

        this.highlightGraphics = this.scene.add.graphics()
            .lineStyle(this.borderSize, 0xffff00, 1)
            .strokeRect(x - this.borderSize / 2, y - this.borderSize / 2, size + this.borderSize, size + this.borderSize);
    }
}
