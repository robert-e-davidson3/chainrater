export class URIValidator {
  static validSchemas = [
    "restaurant://",
    "consumable://",
    "product://",
    "service://",
    "business://",
    "website://",
    "app://",
    "game://",
    "movie://",
    "book://",
    "music://",
    "person://",
  ];

  static validate(uri: string): boolean {
    // Check if URI starts with any of the valid schemas
    const hasValidSchema = this.validSchemas.some((schema) =>
      uri.toLowerCase().startsWith(schema),
    );

    if (!hasValidSchema) {
      return false;
    }

    // Check minimum length after schema
    const parts = uri.split("://");
    if (parts.length !== 2 || parts[1].length < 2) {
      return false;
    }

    return true;
  }

  static formatURI(uri: string): string {
    // Normalize case for schema
    const parts = uri.split("://");
    if (parts.length !== 2) return uri;

    return `${parts[0].toLowerCase()}://${parts[1]}`;
  }

  static getDisplayName(uri: string): string {
    const parts = uri.split("://");
    if (parts.length !== 2) return uri;

    return parts[1];
  }

  static getSchema(uri: string): string {
    const parts = uri.split("://");
    if (parts.length !== 2) return "";

    return parts[0];
  }
}
