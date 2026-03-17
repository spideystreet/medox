import { test, expect } from "@playwright/test";

test.describe("Nephila App", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("loads the app with welcome screen", async ({ page }) => {
    await expect(page.getByTestId("app")).toBeVisible();
    await expect(page.getByTestId("welcome-screen")).toBeVisible();
    await expect(
      page.getByTestId("welcome-screen").getByText("Nephila"),
    ).toBeVisible();
    await expect(
      page.getByText("Assistant pharmaceutique"),
    ).toBeVisible();
  });

  test("displays sidebar with NEPHILA branding", async ({ page }) => {
    await expect(page.getByTestId("sidebar")).toBeVisible();
    await expect(page.getByTestId("new-chat-btn")).toBeVisible();
    await expect(page.getByText("v0.1.0")).toBeVisible();
  });

  test("shows suggestion cards on welcome screen", async ({ page }) => {
    const suggestions = page.getByTestId("suggestion");
    await expect(suggestions).toHaveCount(3);
    await expect(suggestions.first()).toContainText("interactions");
  });

  test("displays chat input with placeholder", async ({ page }) => {
    const input = page.getByTestId("chat-input");
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute(
      "placeholder",
      "Posez votre question...",
    );
  });

  test("send button is disabled when input is empty", async ({ page }) => {
    const sendBtn = page.getByTestId("send-btn");
    await expect(sendBtn).toBeDisabled();
  });

  test("send button enables when text is entered", async ({ page }) => {
    const input = page.getByTestId("chat-input");
    await input.fill("Test question");
    const sendBtn = page.getByTestId("send-btn");
    await expect(sendBtn).toBeEnabled();
  });

  test("disclaimer text is visible", async ({ page }) => {
    await expect(
      page.getByText("Nephila peut faire des erreurs"),
    ).toBeVisible();
  });
});

test.describe("Nephila Sidebar", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("new chat button creates a conversation", async ({ page }) => {
    // Mock the API
    await page.route("**/api/threads", async (route) => {
      if (route.request().method() === "POST") {
        const url = route.request().url();
        if (url.endsWith("/search")) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([]),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              thread_id: "test-thread-1",
              metadata: {},
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }),
          });
        }
      }
    });

    await page.getByTestId("new-chat-btn").click();
    // After creating, the welcome screen should still show (empty thread)
    await expect(page.getByTestId("chat-input")).toBeVisible();
  });

  test("shows no conversations message when empty", async ({ page }) => {
    await page.route("**/api/threads/search", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.goto("/");
    await expect(page.getByText("No conversations yet")).toBeVisible();
  });

  test("displays conversation list", async ({ page }) => {
    await page.route("**/api/threads/search", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            thread_id: "t1",
            metadata: { title: "Interactions amiodarone" },
            created_at: "2026-03-18T10:00:00Z",
            updated_at: "2026-03-18T10:00:00Z",
          },
          {
            thread_id: "t2",
            metadata: { title: "G\u00e9n\u00e9riques Doliprane" },
            created_at: "2026-03-18T09:00:00Z",
            updated_at: "2026-03-18T09:00:00Z",
          },
        ]),
      });
    });

    await page.goto("/");
    const items = page.getByTestId("thread-item");
    await expect(items).toHaveCount(2);
    await expect(items.first()).toContainText("Interactions amiodarone");
  });
});

test.describe("Nephila Chat Messages", () => {
  test("sends a message and displays it", async ({ page }) => {
    // Mock thread creation
    await page.route("**/api/threads", async (route) => {
      if (route.request().method() === "POST") {
        const url = route.request().url();
        if (url.endsWith("/search")) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([]),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              thread_id: "test-thread-msg",
              metadata: {},
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }),
          });
        }
      }
    });

    // Mock streaming response
    await page.route("**/api/threads/*/runs/stream", async (route) => {
      const body = [
        'event: metadata\ndata: {"run_id": "r1"}\n\n',
        'data: [{"langgraph_node": "agent"}, {"content": "Test response from Nephila"}]\n\n',
        "event: end\ndata: null\n\n",
      ].join("");

      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body,
      });
    });

    // Mock thread state after message
    await page.route("**/api/threads/*/state", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          values: {
            messages: [
              {
                type: "human",
                content: "Test question",
                id: "msg-1",
              },
              {
                type: "ai",
                content: "Test response from Nephila",
                id: "msg-2",
              },
            ],
          },
        }),
      });
    });

    await page.goto("/");

    // Type and send
    const input = page.getByTestId("chat-input");
    await input.fill("Test question");
    await page.getByTestId("send-btn").click();

    // User message should appear
    await expect(page.getByTestId("user-message")).toBeVisible();
    await expect(page.getByTestId("user-message")).toContainText(
      "Test question",
    );
  });

  test("displays warning banner for critical interactions", async ({
    page,
  }) => {
    // Mock everything for a warning response
    await page.route("**/api/threads/search", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.route("**/api/threads", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            thread_id: "warn-thread",
            metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        });
      }
    });

    await page.route("**/api/threads/*/runs/stream", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: 'data: [{"langgraph_node": "agent"}, {"content": "done"}]\n\nevent: end\ndata: null\n\n',
      });
    });

    await page.route("**/api/threads/*/state", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          values: {
            messages: [
              { type: "human", content: "interactions?", id: "m1" },
              {
                type: "ai",
                content:
                  "\u26a0\ufe0f **Contre-indication** : Ne pas associer ces deux m\u00e9dicaments.\n\nSOURCES\nCIS 34009375\nCIS 34009123",
                id: "m2",
              },
            ],
          },
        }),
      });
    });

    await page.goto("/");
    await page.getByTestId("chat-input").fill("interactions?");
    await page.getByTestId("send-btn").click();

    // Wait for state to load
    await expect(page.getByTestId("warning-banner")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByTestId("warning-banner")).toContainText("DANGER");

    // Check CIS badges
    const badges = page.getByTestId("cis-badge");
    await expect(badges).toHaveCount(2);
  });
});

test.describe("Nephila Mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("sidebar is hidden on mobile by default @mobile", async ({ page }) => {
    await page.goto("/");
    const sidebar = page.getByTestId("sidebar");
    // Sidebar translated off-screen via -translate-x-full (matrix with negative x)
    await expect(sidebar).toHaveCSS("transform", /matrix/);
    const transform = await sidebar.evaluate(
      (el) => getComputedStyle(el).transform,
    );
    // matrix(1, 0, 0, 1, -288, 0) means translated left
    expect(transform).toMatch(/-\d+/);
  });

  test("hamburger menu opens sidebar on mobile @mobile", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("menu-btn").click();
    await expect(page.getByTestId("sidebar-overlay")).toBeVisible();
  });
});
