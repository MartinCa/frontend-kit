// Fixture for the navigation-is-a-link rule: an onClick/onSelect that only calls navigate()
// must be flagged; handlers that do other work, and non-click handlers, must not be.
declare function navigate(options: { to: string }): Promise<void>;
declare const router: { navigate: (options: { to: string }) => Promise<void> };
declare function save(): void;

export function Menu() {
  return (
    <div>
      {/* flagged: the handler only navigates (8 shapes of the same thing) */}
      <button onClick={() => navigate({ to: "/a" })} />
      <button onClick={() => void navigate({ to: "/b" })} />
      <button onClick={() => router.navigate({ to: "/c" })} />
      <button onClick={() => void router.navigate({ to: "/d" })} />
      <button
        onSelect={() => {
          navigate({ to: "/e" });
        }}
      />
      <button
        onSelect={() => {
          void navigate({ to: "/f" });
        }}
      />
      <button
        onClick={() => {
          router.navigate({ to: "/g" });
        }}
      />
      <button
        onClick={() => {
          void router.navigate({ to: "/h" });
        }}
      />

      {/* not flagged: a redirect after real work, a keyboard handler, a plain handler */}
      <button
        onClick={() => {
          save();
          void navigate({ to: "/ok" });
        }}
      />
      <input onKeyDown={() => void navigate({ to: "/ok" })} />
      <button onClick={() => save()} />
    </div>
  );
}
