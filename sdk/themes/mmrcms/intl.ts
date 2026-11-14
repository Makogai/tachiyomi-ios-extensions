// lib-multisrc/mmrcms/assets/i18n/messages_{en,es}.properties @ d9420cd1, standing in for lib:i18n's Intl.
const messages: Record<string, Record<string, string>> = {
  en: {
    filter_warning: "Ignored if using text search",
    filter_missing_warning: "Press 'Reset' to attempt to show filters",
    category_filter_title: "Category",
    status_filter_title: "Status",
    type_filter_title: "Type",
    year_filter_title: "Year of release",
    author_filter_title: "Author",
    tag_filter_title: "Tag",
    title_begins_with_filter_title: "Title begins with",
    sort_by_filter_title: "Sort by",
  },
  es: {
    filter_warning: "Ignorados si se realiza una búsqueda textual",
    filter_missing_warning: "Presione 'Restablecer' para intentar mostrar los filtros",
    category_filter_title: "Categoría",
    status_filter_title: "Estado",
    type_filter_title: "Tipo",
    year_filter_title: "Año de lanzamiento",
    author_filter_title: "Autor",
    tag_filter_title: "Etiqueta",
    title_begins_with_filter_title: "El título comienza con",
    sort_by_filter_title: "Ordenar por",
  },
};

export class Intl {
  constructor(
    private readonly language: string,
    private readonly baseLanguage = "en",
  ) {}

  get(key: string): string {
    return messages[this.language]?.[key] ?? messages[this.baseLanguage]?.[key] ?? key;
  }
}
