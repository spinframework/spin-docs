// headroom.js ships no type declarations; declare the minimal surface we use.
declare module "headroom.js" {
  interface HeadroomOptions {
    tolerance?: number | { up?: number; down?: number };
    offset?: number;
    classes?: Record<string, string>;
  }
  export default class Headroom {
    constructor(elem: Element, options?: HeadroomOptions);
    init(): this;
    destroy(): void;
    pin(): void;
    unpin(): void;
  }
}
