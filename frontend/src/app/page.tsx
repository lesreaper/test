import { Chat } from "@/components/chat";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-100 px-4 py-8 dark:bg-zinc-950">
      <main className="mx-auto flex w-full flex-1 flex-col items-center">
        <Chat />
      </main>
    </div>
  );
}
