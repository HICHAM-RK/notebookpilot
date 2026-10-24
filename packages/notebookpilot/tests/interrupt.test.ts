import { InterruptChannel } from "../src/runtime/interrupt";

test("interrupts only the matching active message and clears before the next run", () => {
  const channel = new InterruptChannel();
  channel.begin("first");
  expect(channel.interrupt("other")).toBe(false);
  expect(channel.buffer[0]).toBe(0);
  expect(channel.interrupt("first")).toBe(true);
  expect(channel.buffer[0]).toBe(2);
  channel.end("first");
  channel.begin("second");
  expect(channel.buffer[0]).toBe(0);
  expect(channel.interrupt("first")).toBe(false);
});

test("an early cancellation applies only when its own request begins", () => {
  const channel = new InterruptChannel();
  channel.interrupt("future");
  expect(channel.buffer[0]).toBe(0);
  channel.begin("future");
  expect(channel.buffer[0]).toBe(2);
  channel.end("future");
  expect(channel.buffer[0]).toBe(0);
});
