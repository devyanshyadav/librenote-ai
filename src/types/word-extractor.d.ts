declare module "word-extractor" {
  interface WordDocument {
    getBody(): string;
  }

  export default class WordExtractor {
    extract(input: Buffer | string): Promise<WordDocument>;
  }
}
