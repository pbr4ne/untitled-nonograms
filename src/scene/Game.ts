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
    private rowClues: { color: number, count: number }[][] = [];
    private colClues: { color: number, count: number }[][] = [];

    constructor() {
        super({ key: 'Game' });
    }

    create() {
        this.cameras.main.setBackgroundColor('#8ecae6');
        this.analyzeAndDrawImage('picture1');
        this.input.mouse?.disableContextMenu();
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.isDrawing = true;
            this.fillCell(pointer);
        });
        this.input.on('pointerup', () => {
            this.isDrawing = false;
        });
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.isDrawing) {
                this.fillCell(pointer);
            }
        });
    }

    analyzeAndDrawImage(key: string) {
        const texture = this.textures.get(key);

        if (!texture || !texture.source[0] || !(texture.source[0].image instanceof HTMLImageElement)) {
            console.error('Invalid texture source');
            return;
        }

        const imageElement = texture.source[0].image as HTMLImageElement;

        const canvas = document.createElement('canvas');
        canvas.width = imageElement.width;
        canvas.height = imageElement.height;
        const context = canvas.getContext('2d');

        if (context) {
            context.drawImage(imageElement, 0, 0);

            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            //calculate the optimal cell size based on screen size and image size
            const screenWidth = this.sys.game.config.width as number;
            const screenHeight = this.sys.game.config.height as number;
            const maxGridWidth = screenWidth - this.gapSize * 2 - this.gridBorderThickness * 2;
            const maxGridHeight = screenHeight - this.gapSize * 2 - this.gridBorderThickness * 2;
            const cellSizeX = maxGridWidth / (canvas.width + 10);
            const cellSizeY = maxGridHeight / (canvas.height + 10);
            this.cellSize = Math.min(cellSizeX, cellSizeY);

            const gridWidth = canvas.width * this.cellSize;
            const gridHeight = canvas.height * this.cellSize;

            this.offsetX = (screenWidth - gridWidth) / 2 + this.gapSize;
            this.offsetY = (screenHeight - gridHeight) / 2 + this.gapSize;

            this.calculateClues(canvas.width, canvas.height, data);

            //row clues
            for (let y = 0; y < this.rowClues.length; y++) {
                const clues = this.rowClues[y];
                for (let i = 0; i < clues.length; i++) {
                    const clue = clues[i];
                    const cellY = this.offsetY + y * this.cellSize;
                    const cellX = this.offsetX - (clues.length - i + 1) * this.cellSize - this.gapSize;

                    const clueGraphics = this.add.graphics();
                    clueGraphics.fillStyle(clue.color, 1);
                    clueGraphics.fillRect(cellX, cellY, this.cellSize, this.cellSize);
                    clueGraphics.lineStyle(this.borderSize, 0x000000);
                    clueGraphics.strokeRect(cellX, cellY, this.cellSize, this.cellSize);

                    const textColor = this.calculateBrightness(clue.color) < 128 ? '#ffffff' : '#000000';
                    this.add.text(cellX + this.cellSize / 2, cellY + this.cellSize / 2, clue.count.toString(), { color: textColor })
                        .setOrigin(0.5);
                }
            }

            // Draw column clues
            for (let x = 0; x < this.colClues.length; x++) {
                const clues = this.colClues[x];
                for (let i = 0; i < clues.length; i++) {
                    const clue = clues[i];
                    const cellX = this.offsetX + x * this.cellSize;
                    const cellY = this.offsetY - (clues.length - i + 1) * this.cellSize - this.gapSize;

                    const clueGraphics = this.add.graphics();
                    clueGraphics.fillStyle(clue.color, 1);
                    clueGraphics.fillRect(cellX, cellY, this.cellSize, this.cellSize);
                    clueGraphics.lineStyle(this.borderSize, 0x000000);
                    clueGraphics.strokeRect(cellX, cellY, this.cellSize, this.cellSize);

                    const textColor = this.calculateBrightness(clue.color) < 128 ? '#ffffff' : '#000000';
                    this.add.text(cellX + this.cellSize / 2, cellY + this.cellSize / 2, clue.count.toString(), { color: textColor })
                        .setOrigin(0.5);
                }
            }

            //game grid
            for (let y = 0; y < canvas.height; y++) {
                const row: Phaser.GameObjects.Graphics[] = [];
                for (let x = 0; x < canvas.width; x++) {
                    const index = (x + y * canvas.width) * 4;
                    const r = data[index];
                    const g = data[index + 1];
                    const b = data[index + 2];
                    const a = data[index + 3] / 255;

                    const cellX = this.offsetX + x * this.cellSize;
                    const cellY = this.offsetY + y * this.cellSize;

                    const graphics = this.add.graphics();
                    graphics.fillStyle(Phaser.Display.Color.GetColor(r, g, b), a);
                    graphics.fillRect(cellX, cellY, this.cellSize, this.cellSize);

                    row.push(graphics);

                    const rect = this.add.rectangle(cellX + this.cellSize / 2, cellY + this.cellSize / 2, this.cellSize, this.cellSize, 0xffffff, 0)
                        .setInteractive({ useHandCursor: true });

                    rect.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
                        if (pointer.rightButtonDown()) {
                            graphics.clear();
                            graphics.lineStyle(this.borderSize, 0x000000);
                            graphics.strokeRect(cellX, cellY, this.cellSize, this.cellSize);
                        } else {
                            this.currentColor = Phaser.Display.Color.GetColor(255, 255, 255);
                            graphics.fillStyle(this.currentColor, 1);
                            graphics.fillRect(cellX, cellY, this.cellSize, this.cellSize);
                        }
                    });
                }
                this.cellGraphics.push(row);
            }

            //grid lines
            const gridGraphics = this.add.graphics();
            gridGraphics.lineStyle(this.borderSize, 0x000000);
            for (let x = 0; x <= canvas.width; x++) {
                const lineX = this.offsetX + x * this.cellSize;
                gridGraphics.moveTo(lineX, this.offsetY);
                gridGraphics.lineTo(lineX, this.offsetY + gridHeight);
            }
            for (let y = 0; y <= canvas.height; y++) {
                const lineY = this.offsetY + y * this.cellSize;
                gridGraphics.moveTo(this.offsetX, lineY);
                gridGraphics.lineTo(this.offsetX + gridWidth, lineY);
            }
            gridGraphics.strokePath();

            //border around game grid
            const borderGraphics = this.add.graphics();
            borderGraphics.lineStyle(this.gridBorderThickness, 0x000000);
            borderGraphics.strokeRect(
                this.offsetX - this.borderSize / 2,
                this.offsetY - this.borderSize / 2,
                gridWidth + this.borderSize,
                gridHeight + this.borderSize
            );

        } else {
            console.error('Unable to get 2D context from canvas');
        }
    }

    calculateClues(width: number, height: number, data: Uint8ClampedArray) {
        this.rowClues = [];
        this.colClues = [];

        for (let y = 0; y < height; y++) {
            const row: { color: number, count: number }[] = [];
            let count = 0;
            let currentColor = 0;
            for (let x = 0; x < width; x++) {
                const index = (x + y * width) * 4;
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                const a = data[index + 3] / 255;
                const color = Phaser.Display.Color.GetColor(r, g, b);

                if (a > 0 && (count === 0 || color === currentColor)) {
                    count++;
                    currentColor = color;
                } else {
                    if (count > 0) {
                        row.push({ color: currentColor, count });
                    }
                    currentColor = color;
                    count = a > 0 ? 1 : 0;
                }
            }
            if (count > 0) row.push({ color: currentColor, count });
            this.rowClues.push(row);
        }

        for (let x = 0; x < width; x++) {
            const col: { color: number, count: number }[] = [];
            let count = 0;
            let currentColor = 0;
            for (let y = 0; y < height; y++) {
                const index = (x + y * width) * 4;
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                const a = data[index + 3] / 255;
                const color = Phaser.Display.Color.GetColor(r, g, b);

                if (a > 0 && (count === 0 || color === currentColor)) {
                    count++;
                    currentColor = color;
                } else {
                    if (count > 0) {
                        col.push({ color: currentColor, count });
                    }
                    currentColor = color;
                    count = a > 0 ? 1 : 0;
                }
            }
            if (count > 0) col.push({ color: currentColor, count });
            this.colClues.push(col);
        }
    }

    calculateBrightness(color: number): number {
        const r = (color >> 16) & 0xff;
        const g = (color >> 8) & 0xff;
        const b = color & 0xff;
        return Math.sqrt(0.299 * r * r + 0.587 * g * g + 0.114 * b * b);
    }

    fillCell(pointer: Phaser.Input.Pointer) {
        const pointerX = Math.floor((pointer.x - this.offsetX) / this.cellSize);
        const pointerY = Math.floor((pointer.y - this.offsetY) / this.cellSize);

        if (pointerX < 0 || pointerX >= this.cellGraphics[0].length || pointerY < 0 || pointerY >= this.cellGraphics.length) {
            return;
        }

        const cellX = this.offsetX + pointerX * this.cellSize;
        const cellY = this.offsetY + pointerY * this.cellSize;

        const graphics = this.cellGraphics[pointerY][pointerX];

        if (pointer.rightButtonDown()) {
            graphics.clear();
            graphics.lineStyle(this.borderSize, 0x000000);
            graphics.strokeRect(cellX, cellY, this.cellSize, this.cellSize);
        } else {
            graphics.fillStyle(this.currentColor, 1);
            graphics.fillRect(cellX, cellY, this.cellSize, this.cellSize);
            graphics.lineStyle(this.borderSize, 0x000000);
            graphics.strokeRect(cellX, cellY, this.cellSize, this.cellSize);
        }
    }
}
