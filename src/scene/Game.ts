import Phaser from 'phaser';

export default class Game extends Phaser.Scene {
    private isDrawing: boolean = false;
    private currentColor: number = 0xffffff;
    private cellSize: number = 30;
    private borderSize: number = 2;
    private gridBorderThickness: number = 5;
    private gapSize: number = 0;
    private offsetX: number = 0;
    private offsetY: number = 0;
    private cellGraphics: Phaser.GameObjects.Graphics[][] = [];
    private cellRectangles: Phaser.GameObjects.Rectangle[][] = [];
    private cellColors: number[][] = [];
    private rowClues: { color: number, count: number }[][] = [];
    private colClues: { color: number, count: number }[][] = [];
    private colorPalette: Phaser.GameObjects.Graphics[] = [];
    private gridGraphics?: Phaser.GameObjects.Graphics;

    constructor() {
        super({ key: 'Game' });
    }

    create() {
        this.cameras.main.setBackgroundColor('#8ecae6');
        this.analyzeAndDrawImage('picture1');
        this.input.mouse?.disableContextMenu();
        this.setupInputEvents();
    }

    private setupInputEvents() {
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.isDrawing = true;
            this.fillCell(pointer);
        });
        this.input.on('pointerup', () => {
            this.isDrawing = false;
            this.checkCompletion();
        });
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.isDrawing) {
                this.fillCell(pointer);
            }
        });
    }

    private analyzeAndDrawImage(key: string) {
        const texture = this.textures.get(key);
        if (!texture?.source[0]?.image) {
            console.error('Invalid texture source');
            return;
        }

        const imageElement = texture.source[0].image as HTMLImageElement;
        const [canvas, context] = this.createCanvasAndContext(imageElement);

        if (context) {
            context.drawImage(imageElement, 0, 0);
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            this.initializeGrid(imageData, canvas.width, canvas.height);
        } else {
            console.error('Unable to get 2D context from canvas');
        }
    }

    private createCanvasAndContext(imageElement: HTMLImageElement): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
        const canvas = document.createElement('canvas');
        canvas.width = imageElement.width;
        canvas.height = imageElement.height;
        const context = canvas.getContext('2d');
        return [canvas, context];
    }

    private initializeGrid(imageData: ImageData, width: number, height: number) {
        const screenWidth = this.sys.game.config.width as number;
        const screenHeight = this.sys.game.config.height as number;
        const maxGridWidth = screenWidth - this.gapSize * 2 - this.gridBorderThickness * 2;
        const maxGridHeight = screenHeight - this.gapSize * 2 - this.gridBorderThickness * 2;
        const cellSizeX = maxGridWidth / (width + 10);
        const cellSizeY = maxGridHeight / (height + 10);
        this.cellSize = Math.min(cellSizeX, cellSizeY);

        const gridWidth = width * this.cellSize;
        const gridHeight = height * this.cellSize;

        this.calculateClues(width, height, imageData.data);

        const maxRowClues = Math.max(...this.rowClues.map(clues => clues.length));
        const maxColClues = Math.max(...this.colClues.map(clues => clues.length));

        const totalWidth = gridWidth + maxRowClues * this.cellSize + this.gapSize;
        const totalHeight = gridHeight + maxColClues * this.cellSize + this.gapSize;

        this.offsetX = (screenWidth - totalWidth) / 2 + maxRowClues * this.cellSize + this.gapSize;
        this.offsetY = (screenHeight - totalHeight) / 2 + maxColClues * this.cellSize + this.gapSize;

        const uniqueColors = this.extractUniqueColors(imageData.data);
        this.drawColorPalette(uniqueColors);

        this.initializeCellArrays(width, height);
        this.drawClues();
        this.drawGrid(width, height, gridWidth, gridHeight);
    }

    private initializeCellArrays(width: number, height: number) {
        this.cellColors = Array.from({ length: height }, () => Array(width).fill(0xffffff));
        for (let y = 0; y < height; y++) {
            const row: Phaser.GameObjects.Graphics[] = [];
            const rectRow: Phaser.GameObjects.Rectangle[] = [];
            for (let x = 0; x < width; x++) {
                const cellX = this.offsetX + x * this.cellSize;
                const cellY = this.offsetY + y * this.cellSize;
                const graphics = this.add.graphics().fillRect(cellX, cellY, this.cellSize, this.cellSize);
                const rect = this.add.rectangle(cellX + this.cellSize / 2, cellY + this.cellSize / 2, this.cellSize, this.cellSize, 0xffffff, 0)
                    .setInteractive({ useHandCursor: true });

                rect.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.handleCellPointerDown(pointer, graphics, x, y, cellX, cellY));

                row.push(graphics);
                rectRow.push(rect);
            }
            this.cellGraphics.push(row);
            this.cellRectangles.push(rectRow);
        }
    }

    private handleCellPointerDown(pointer: Phaser.Input.Pointer, graphics: Phaser.GameObjects.Graphics, x: number, y: number, cellX: number, cellY: number) {
        if (pointer.rightButtonDown()) {
            graphics.clear().lineStyle(this.borderSize, 0x000000).strokeRect(cellX, cellY, this.cellSize, this.cellSize);
            this.cellColors[y][x] = 0xffffff;
        } else {
            graphics.fillStyle(this.currentColor, 1).fillRect(cellX, cellY, this.cellSize, this.cellSize).lineStyle(this.borderSize, 0x000000).strokeRect(cellX, cellY, this.cellSize, this.cellSize);
            this.cellColors[y][x] = this.currentColor;
        }
    }

    private drawGrid(width: number, height: number, gridWidth: number, gridHeight: number) {
        this.gridGraphics = this.add.graphics().lineStyle(this.borderSize, 0x000000);
        for (let x = 0; x <= width; x++) {
            const lineX = this.offsetX + x * this.cellSize;
            this.gridGraphics.moveTo(lineX, this.offsetY).lineTo(lineX, this.offsetY + gridHeight);
        }
        for (let y = 0; y <= height; y++) {
            const lineY = this.offsetY + y * this.cellSize;
            this.gridGraphics.moveTo(this.offsetX, lineY).lineTo(this.offsetX + gridWidth, lineY);
        }
        this.gridGraphics.strokePath();

        this.add.graphics().lineStyle(this.gridBorderThickness, 0x000000).strokeRect(
            this.offsetX - this.borderSize / 2,
            this.offsetY - this.borderSize / 2,
            gridWidth + this.borderSize,
            gridHeight + this.borderSize
        );
    }

    private extractUniqueColors(data: Uint8ClampedArray): number[] {
        const uniqueColors = new Set<number>();
        for (let i = 0; i < data.length; i += 4) {
            const [r, g, b, a] = data.slice(i, i + 4);
            if (a > 0) {
                uniqueColors.add(Phaser.Display.Color.GetColor(r, g, b));
            }
        }
        this.currentColor = Array.from(uniqueColors)[0];
        return Array.from(uniqueColors);
    }

    drawColorPalette(colors: number[]) {
        const paletteSize = 40;
        const paletteMargin = 10;
        const startX = this.gapSize + 10;
        const startY = (this.sys.game.config.height as number) - paletteSize - paletteMargin;
    
        colors.forEach((color, index) => {
            const x = startX + (index * (paletteSize + paletteMargin));
            const paletteGraphics = this.add.graphics()
                .fillStyle(color, 1)
                .fillRect(x, startY, paletteSize, paletteSize)
                .lineStyle(this.borderSize, 0x000000)
                .strokeRect(x, startY, paletteSize, paletteSize);
    
            paletteGraphics.setInteractive(new Phaser.Geom.Rectangle(x, startY, paletteSize, paletteSize), Phaser.Geom.Rectangle.Contains);
    
            if (paletteGraphics.input) {
                paletteGraphics.input.cursor = 'pointer';
            }
    
            paletteGraphics.on('pointerdown', () => {
                this.currentColor = color;
            });
    
            this.colorPalette.push(paletteGraphics);
        });
    }

    private calculateClues(width: number, height: number, data: Uint8ClampedArray) {
        this.rowClues = this.generateClues(width, height, data, true);
        this.colClues = this.generateClues(width, height, data, false);
    }

    private generateClues(width: number, height: number, data: Uint8ClampedArray, isRow: boolean) {
        const clues: { color: number, count: number }[][] = [];
        for (let i = 0; i < (isRow ? height : width); i++) {
            const line: { color: number, count: number }[] = [];
            let count = 0;
            let currentColor = 0;
            for (let j = 0; j < (isRow ? width : height); j++) {
                const index = ((isRow ? j + i * width : i + j * width) * 4);
                const [r, g, b, a] = data.slice(index, index + 4);
                const color = Phaser.Display.Color.GetColor(r, g, b);

                if (a > 0 && (count === 0 || color === currentColor)) {
                    count++;
                    currentColor = color;
                } else {
                    if (count > 0) line.push({ color: currentColor, count });
                    currentColor = color;
                    count = a > 0 ? 1 : 0;
                }
            }
            if (count > 0) line.push({ color: currentColor, count });
            clues.push(line);
        }
        return clues;
    }

    private calculateBrightness(color: number): number {
        const r = (color >> 16) & 0xff;
        const g = (color >> 8) & 0xff;
        const b = color & 0xff;
        return Math.sqrt(0.299 * r * r + 0.587 * g * g + 0.114 * b * b);
    }

    private drawClues() {
        this.drawClueSet(this.rowClues, true);
        this.drawClueSet(this.colClues, false);
    }

    private drawClueSet(clues: { color: number, count: number }[][], isRow: boolean) {
        clues.forEach((clueSet, i) => {
            clueSet.forEach((clue, j) => {
                const [cellX, cellY] = isRow ?
                    [this.offsetX - (clueSet.length - j + 1) * this.cellSize - this.gapSize, this.offsetY + i * this.cellSize] :
                    [this.offsetX + i * this.cellSize, this.offsetY - (clueSet.length - j + 1) * this.cellSize - this.gapSize];

                const clueGraphics = this.add.graphics().fillStyle(clue.color, 1)
                    .fillRect(cellX, cellY, this.cellSize, this.cellSize)
                    .lineStyle(this.borderSize, 0x000000)
                    .strokeRect(cellX, cellY, this.cellSize, this.cellSize);

                const textColor = this.calculateBrightness(clue.color) < 128 ? '#ffffff' : '#000000';
                this.add.text(cellX + this.cellSize / 2, cellY + this.cellSize / 2, clue.count.toString(), { color: textColor })
                    .setOrigin(0.5);
            });
        });
    }

    private fillCell(pointer: Phaser.Input.Pointer) {
        const pointerX = Math.floor((pointer.x - this.offsetX) / this.cellSize);
        const pointerY = Math.floor((pointer.y - this.offsetY) / this.cellSize);

        if (pointerX < 0 || pointerX >= this.cellGraphics[0].length || pointerY < 0 || pointerY >= this.cellGraphics.length) {
            return;
        }

        const cellX = this.offsetX + pointerX * this.cellSize;
        const cellY = this.offsetY + pointerY * this.cellSize;

        const graphics = this.cellGraphics[pointerY][pointerX];

        if (pointer.rightButtonDown()) {
            graphics.clear().lineStyle(this.borderSize, 0x000000).strokeRect(cellX, cellY, this.cellSize, this.cellSize);
            this.cellColors[pointerY][pointerX] = 0xffffff;
        } else {
            graphics.fillStyle(this.currentColor, 1).fillRect(cellX, cellY, this.cellSize, this.cellSize).lineStyle(this.borderSize, 0x000000).strokeRect(cellX, cellY, this.cellSize, this.cellSize);
            this.cellColors[pointerY][pointerX] = this.currentColor;
        }
    }

    private checkCompletion() {
        const texture = this.textures.get('picture1');
        const imageElement = texture.source[0].image as HTMLImageElement;

        const [canvas, context] = this.createCanvasAndContext(imageElement);

        if (context) {
            context.drawImage(imageElement, 0, 0);
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

            if (this.isGridComplete(imageData.data, canvas.width, canvas.height)) {
                this.finalizeGrid();
            }
        }
    }

    private isGridComplete(data: Uint8ClampedArray, width: number, height: number): boolean {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = (x + y * width) * 4;
                const [r, g, b, a] = data.slice(index, index + 4);
                const color = Phaser.Display.Color.GetColor(r, g, b);

                if (color === 0) {
                    continue;
                }
                if ((a > 0 && this.cellColors[y][x] === 0xffffff) || (a <= 0 && this.cellColors[y][x] !== color) || (a === 0 && this.cellColors[y][x] !== 0xffffff)) {
                    console.log(x, y, color, this.cellColors[y][x]);
                    console.log("false");
                    return false;
                }
            }
        }
        return true;
    }

    private finalizeGrid() {
        this.gridGraphics?.clear();

        for (let y = 0; y < this.cellGraphics.length; y++) {
            for (let x = 0; x < this.cellGraphics[y].length; x++) {
                const graphics = this.cellGraphics[y][x];
                graphics.clear();
                const color = this.cellColors[y][x];
                if (color !== 0xffffff) {
                    graphics.fillStyle(color, 1).fillRect(this.offsetX + x * this.cellSize, this.offsetY + y * this.cellSize, this.cellSize, this.cellSize);
                }
            }
        }

        this.input.off('pointerdown');
        this.input.off('pointerup');
        this.input.off('pointermove');

        for (const rectRow of this.cellRectangles) {
            for (const rect of rectRow) {
                rect.disableInteractive();
            }
        }
    }
}
