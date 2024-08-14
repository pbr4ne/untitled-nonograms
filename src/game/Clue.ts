export default class Clue {
    private color: number;
    private number: number;

    constructor(color: number, number: number) {
        this.color = color;
        this.number = number;
    }

    public getColor(): number {
        return this.color;
    }

    public getNumber(): number {
        return this.number;
    }
}