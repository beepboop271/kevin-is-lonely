export interface IQueue<T> {
  enqueue(data: T): void;
  dequeue(): T | undefined;
  available(): boolean;
}

export class ArrayQueue<T> implements IQueue<T> {
  private readonly _data: T[];

  public constructor() {
    this._data = [];
  }

  public enqueue(data: T): void {
    this._data.push(data);
  }

  public dequeue(): T | undefined {
    return this._data.shift();
  }

  public available(): boolean {
    return this._data.length > 0;
  }
}

export class CircularQueue<T> implements IQueue<T> {
  private readonly size: number;

  private readonly _queue: Array<T | undefined>;
  private _readIdx: number;
  private _writeIdx: number;

  public constructor(size: number) {
    this.size = size;

    this._queue = new Array(size).fill(undefined);
    this._readIdx = 0;
    this._writeIdx = 0;
  }

  public enqueue(element: T): void {
    if (this._queue[this._writeIdx] !== undefined) {
      throw new Error("queue is full");
    }
    this._queue[this._writeIdx] = element;
    this._writeIdx = (this._writeIdx + 1) % this.size;
  }

  public dequeue(): T | undefined {
    const element: T | undefined = this._queue[this._readIdx];
    if (element === undefined) {
      return undefined;
    }
    this._queue[this._readIdx] = undefined;
    this._readIdx = (this._readIdx + 1) % this.size;

    return element;
  }

  public available(): boolean {
    return (this._queue[this._readIdx] !== undefined);
  }
}
