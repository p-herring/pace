"use client";

import { SendHorizontal } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { paceSendPlanMessageAction } from "@/app/actions/muster";
import { Avatar } from "@/components/avatar";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

type ChatSender = {
  display_name: string;
  avatar_url: string | null;
};

export type PlanChatMessage = {
  id: string;
  plan_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  sender: ChatSender;
};

type PlanChatProps = {
  planId: string;
  currentUserId: string;
  canChat: boolean;
  isReadOnly: boolean;
  initialMessages: PlanChatMessage[];
};

function messageTime(value: string) {
  return new Date(value).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}

export function PlanChat({ planId, currentUserId, canChat, isReadOnly, initialMessages }: PlanChatProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [state, formAction] = useActionState(paceSendPlanMessageAction, {});
  const [isNearBottom, setIsNearBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!canChat) return;
    const supabase = getBrowserSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`pace-plan-chat:${planId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pace_plan_messages",
          filter: `plan_id=eq.${planId}`,
        },
        async (payload) => {
          const inserted = payload.new as { id?: string };
          if (!inserted.id) return;

          const { data } = await supabase
            .from("pace_plan_messages")
            .select("id,plan_id,sender_id,body,created_at,sender:pace_profiles!pace_plan_messages_sender_id_fkey(display_name,avatar_url)")
            .eq("id", inserted.id)
            .maybeSingle();

          if (!data) return;
          const sender = Array.isArray(data.sender) ? data.sender[0] : data.sender;
          const nextMessage: PlanChatMessage = {
            id: data.id,
            plan_id: data.plan_id,
            sender_id: data.sender_id,
            body: data.body,
            created_at: data.created_at,
            sender: {
              display_name: sender?.display_name ?? "Muster member",
              avatar_url: sender?.avatar_url ?? null,
            },
          };

          setMessages((current) => {
            if (current.some((message) => message.id === nextMessage.id)) return current;
            return [...current, nextMessage];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [canChat, planId]);

  useEffect(() => {
    if (!isNearBottom) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isNearBottom]);

  useEffect(() => {
    if (state?.sentAt) textareaRef.current!.value = "";
  }, [state?.sentAt]);

  if (!canChat) {
    return (
      <section className="plan-chat plan-chat-locked" aria-labelledby="plan-chat-title">
        <p className="muster-kicker">Chat</p>
        <h2 id="plan-chat-title">Join the plan to access chat</h2>
        <p>Once you’re confirmed, you’ll be able to see the group chat and say hi.</p>
      </section>
    );
  }

  return (
    <section className="plan-chat" aria-labelledby="plan-chat-title">
      <div className="plan-chat-head">
        <div>
          <p className="muster-kicker">Chat</p>
          <h2 id="plan-chat-title">Plan chat</h2>
        </div>
        {isReadOnly ? <span className="badge badge-neutral">Read-only</span> : null}
      </div>

      <div
        className="plan-chat-messages"
        ref={scrollRef}
        onScroll={(event) => {
          const element = event.currentTarget;
          setIsNearBottom(element.scrollHeight - element.scrollTop - element.clientHeight < 80);
        }}
      >
        {messages.length ? (
          messages.map((message, index) => {
            const previous = messages[index - 1];
            const grouped = previous?.sender_id === message.sender_id;

            return (
              <article className={`chat-message ${grouped ? "grouped" : ""}`} key={message.id}>
                {!grouped ? (
                  <Avatar name={message.sender.display_name} avatarUrl={message.sender.avatar_url} size={32} />
                ) : (
                  <span className="chat-message-spacer" />
                )}
                <div>
                  {!grouped ? (
                    <p className="chat-message-meta">
                      <span>{message.sender_id === currentUserId ? "You" : message.sender.display_name}</span>
                      <time>{messageTime(message.created_at)}</time>
                    </p>
                  ) : null}
                  <p className="chat-message-body">{message.body}</p>
                </div>
              </article>
            );
          })
        ) : (
          <div className="plan-chat-empty">
            <h3>Say hi 👋</h3>
            <p>No messages yet. A tiny greeting is often enough to make the plan feel real.</p>
          </div>
        )}
      </div>

      {!isReadOnly ? (
        <form action={formAction} className="plan-chat-composer">
          <input type="hidden" name="planId" value={planId} />
          {state?.error ? <p className="form-error">{state.error}</p> : null}
          <label>
            Message
            <textarea
              ref={textareaRef}
              name="body"
              rows={2}
              maxLength={2000}
              placeholder="Write a message…"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
          </label>
          <button className="muster-primary" type="submit">
            <SendHorizontal className="h-4 w-4" />
            Send
          </button>
        </form>
      ) : (
        <p className="plan-chat-readonly-note">This chat is closed because the plan was cancelled.</p>
      )}
    </section>
  );
}
