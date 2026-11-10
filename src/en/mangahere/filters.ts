// Port of src/en/mangahere/.../Filters.kt @ d9420cd1.
import { Group, Select, Text, TriState } from "@sdk";

export class Genre extends TriState {
  constructor(
    name: string,
    readonly id: number,
  ) {
    super(name);
  }
}

export class TypeList extends Select<string> {
  constructor(types: string[]) {
    super("Type", types, 1);
  }
}

export class CompletionList extends Select<string> {
  constructor(completions: string[]) {
    super("Completed series", completions, 0);
  }
}

export class RatingList extends Select<string> {
  constructor(ratings: string[]) {
    super("Minimum rating", ratings, 0);
  }
}

export class GenreList extends Group<Genre> {
  constructor(genres: Genre[]) {
    super("Genres", genres);
  }
}

export class ArtistFilter extends Text {}
export class AuthorFilter extends Text {}
export class YearFilter extends Text {}

export const types: Record<string, number> = {
  "Japanese Manga": 1,
  "Korean Manhwa": 2,
  "Chinese Manhua": 3,
  "European Manga": 4,
  "American Manga": 5,
  "Hong Kong Manga": 6,
  "Other Manga": 7,
  Any: 0,
};

export const completions = ["Either", "No", "Yes"];
export const ratings = ["No Stars", "1 Star", "2 Stars", "3 Stars", "4 Stars", "5 Stars"];

export const genres = (): Genre[] => [
  new Genre("Action", 1),
  new Genre("Adventure", 2),
  new Genre("Comedy", 3),
  new Genre("Fantasy", 4),
  new Genre("Historical", 5),
  new Genre("Horror", 6),
  new Genre("Martial Arts", 7),
  new Genre("Mystery", 8),
  new Genre("Romance", 9),
  new Genre("Shounen Ai", 10),
  new Genre("Supernatural", 11),
  new Genre("Drama", 12),
  new Genre("Shounen", 13),
  new Genre("School Life", 14),
  new Genre("Shoujo", 15),
  new Genre("Gender Bender", 16),
  new Genre("Josei", 17),
  new Genre("Psychological", 18),
  new Genre("Seinen", 19),
  new Genre("Slice of Life", 20),
  new Genre("Sci-fi", 21),
  new Genre("Ecchi", 22),
  new Genre("Harem", 23),
  new Genre("Shoujo Ai", 24),
  new Genre("Yuri", 25),
  new Genre("Mature", 26),
  new Genre("Tragedy", 27),
  new Genre("Yaoi", 28),
  new Genre("Doujinshi", 29),
  new Genre("Sports", 30),
  new Genre("Adult", 31),
  new Genre("One Shot", 32),
  new Genre("Smut", 33),
  new Genre("Mecha", 34),
  new Genre("Shotacon", 35),
  new Genre("Lolicon", 36),
  new Genre("Webtoons", 37),
];
