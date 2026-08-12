// Assertions Helper
export class AssertionsHelper {
  static expectForbidden(response: any, expectedReason?: string) {
    expect(response.status).toBe(403);
    if (expectedReason) {
      expect(response.body.message).toContain(expectedReason);
    }
  }
}
