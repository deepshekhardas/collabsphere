import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Search,
  CheckCircle2,
  Check,
  MoreVertical,
  Phone,
  Video,
  Info,
} from "lucide-react";
import { motion } from "motion/react";
import { User } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  addDoc,
  serverTimestamp,
  orderBy,
  limit,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";

interface Message {
  id: string | number;
  sender: string;
  text: string;
  time: string;
  isMe: boolean;
  timestamp: number;
  status: "sent" | "delivered" | "read";
}

interface ChatContact {
  id: string;
  name: string;
  role: string;
  online: boolean;
  lastActive: string;
  messages?: Message[];
}

interface ChatProps {
  user: User;
  profile: any;
}

const formatMessageTime = (date: Date) => {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatRelativeTime = (date: Date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (isToday) return formatMessageTime(date);

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return "Yesterday";

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

export function Chat({ user, profile }: ChatProps) {
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [allMessages, setAllMessages] = useState<any[]>([]);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isTyping, setIsTyping] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch all potential contacts
  useEffect(() => {
    let unsubscribeCr: () => void;
    let unsubscribeB: () => void;

    async function setupListeners() {
      try {
        const crQuery = query(collection(db, "creatorProfiles"));
        unsubscribeCr = onSnapshot(
          crQuery,
          (crSnap) => {
            const crContacts = crSnap.docs.map((doc) => ({
              id: doc.id,
              name: doc.data().displayName || doc.data().name || "Creator",
              role: "Creator",
              online: Math.random() > 0.5,
              lastActive: "10m ago",
            }));

            const bQuery = query(collection(db, "businessProfiles"));
            unsubscribeB = onSnapshot(
              bQuery,
              (bSnap) => {
                const bContacts = bSnap.docs.map((doc) => ({
                  id: doc.id,
                  name: doc.data().name || doc.data().displayName || "Business",
                  role: "Business",
                  online: Math.random() > 0.5,
                  lastActive: "1h ago",
                }));

                let allUsers = [...crContacts, ...bContacts].filter(
                  (c) => c.id !== user.uid,
                );

                // Add dummy ones if the list is empty for demo purposes
                if (allUsers.length === 0) {
                  allUsers = [
                    {
                      id: "dummy1",
                      name: "Alice (Nova Skincare)",
                      role: "Brand",
                      online: true,
                      lastActive: "Just now",
                    },
                    {
                      id: "dummy2",
                      name: "David (Nexus Athletics)",
                      role: "Brand",
                      online: false,
                      lastActive: "2h ago",
                    },
                  ];
                }

                setContacts(allUsers);
                if (allUsers.length > 0 && !activeContactId) {
                  setActiveContactId(allUsers[0].id);
                }
              },
              (error) => {
                handleFirestoreError(
                  error,
                  OperationType.LIST,
                  "businessProfiles",
                );
              },
            );
          },
          (error) => {
            handleFirestoreError(error, OperationType.LIST, "creatorProfiles");
          },
        );
      } catch (error) {
        console.error(error);
      }
    }

    setupListeners();

    return () => {
      if (unsubscribeCr) unsubscribeCr();
      if (unsubscribeB) unsubscribeB();
    };
  }, [user.uid]);

  // Initial dummy messages for better UX
  useEffect(() => {
    const dummyInitial = [
      {
        id: "msg_d1",
        participants: [user.uid, "dummy1"],
        senderId: "dummy1",
        senderName: "Alice (Nova Skincare)",
        text: "Hey! We loved your recent tech review. Would you be open to collaborating on our new launch?",
        createdAt: { toDate: () => new Date(Date.now() - 1000 * 60 * 60 * 24) }, // 1 day ago
      },
      {
        id: "msg_d2",
        participants: [user.uid, "dummy2"],
        senderId: "dummy2",
        senderName: "David (Nexus Athletics)",
        text: "Just sent over the contract for the Q3 campaign. Let me know if you have questions!",
        createdAt: { toDate: () => new Date(Date.now() - 1000 * 60 * 60 * 2) }, // 2 hrs ago
      },
    ];
    setAllMessages((prev) => {
      // Only add dummy messages if they don't exist yet to avoid duplicates on re-renders
      if (!prev.find((m) => m.id === "msg_d1")) {
        return [...dummyInitial, ...prev];
      }
      return prev;
    });
  }, [user.uid]);

  // Listen for messages
  useEffect(() => {
    if (!user.uid) return;
    // Limit to latest 50 for performance (Pseudo-pagination for realtime)
    const q = query(
      collection(db, "messages"),
      where("participants", "array-contains", user.uid),
      orderBy("createdAt", "desc"),
      limit(50),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAllMessages((prev) => {
          // Keep existing dummy ones
          const dummies = prev.filter(
            (m) =>
              m.id.toString().startsWith("msg_d") ||
              m.senderId.startsWith("dummy"),
          );
          // Avoid duplicates if some dummy messages were already added to the list
          const realMsgs = msgs.filter(
            (m) => !dummies.find((d) => d.id === m.id),
          );
          // Sort asc for display
          return [...dummies, ...realMsgs].sort((a, b) => {
            const timeA = a.createdAt?.toDate
              ? a.createdAt.toDate()
              : new Date();
            const timeB = b.createdAt?.toDate
              ? b.createdAt.toDate()
              : new Date();
            return timeA.getTime() - timeB.getTime();
          });
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "messages");
      },
    );
    return () => unsubscribe();
  }, [user.uid]);

  // Compute contacts with their respective messages
  const computedContacts = contacts
    .map((c) => {
      const contactMsgs = allMessages
        .filter((m) => m.participants && m.participants.includes(c.id))
        .map((m) => {
          const date =
            m.createdAt && m.createdAt.toDate
              ? m.createdAt.toDate()
              : new Date();
          return {
            id: m.id,
            sender: m.senderName || "User",
            text: m.text,
            time: formatMessageTime(date),
            timestamp: date.getTime(),
            isMe: m.senderId === user.uid,
            status: "read" as const, // Simple mock, 'sent' -> 'delivered' -> 'read' could be dynamic
          };
        });
      return { ...c, messages: contactMsgs };
    })
    .sort((a, b) => {
      // Sort by latest message date
      const lastMsgA =
        a.messages && a.messages.length > 0
          ? a.messages[a.messages.length - 1].timestamp
          : 0;
      const lastMsgB =
        b.messages && b.messages.length > 0
          ? b.messages[b.messages.length - 1].timestamp
          : 0;
      return lastMsgB - lastMsgA;
    });

  const activeContact = computedContacts.find((c) => c.id === activeContactId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeContact?.messages?.length, isTyping]);

  const simulateReply = (contactId: string, contactName: string) => {
    setIsTyping((prev) => ({ ...prev, [contactId]: true }));
    // Simulate finding the contact to update sort order instantly

    setTimeout(() => {
      setIsTyping((prev) => ({ ...prev, [contactId]: false }));
      const replies = [
        "That sounds perfect. Let's move forward with this.",
        "Got it! I'll check with my team and get back to you shortly.",
        "Can you send over some examples of your previous related work?",
        "Awesome! I've updated the brief on your dashboard.",
        "Thanks for the update. Let's schedule a call this week to finalize details.",
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];

      const fakeMessage = {
        participants: [user.uid, contactId],
        senderId: contactId,
        senderName: contactName,
        text: randomReply,
        createdAt: { toDate: () => new Date() },
      };
      setAllMessages((prev) => [
        ...prev,
        { id: "msg_r_" + Date.now().toString(), ...fakeMessage },
      ]);
    }, 2500);
  };

  const handleSend = async () => {
    if (!input.trim() || !activeContactId) return;
    const textToSend = input.trim();
    setInput("");
    const currentActive = activeContact;

    try {
      const isDummy = activeContactId.startsWith("dummy");
      if (isDummy && currentActive) {
        // Optimistically add to state for dummy
        const fakeMessage = {
          participants: [user.uid, activeContactId],
          senderId: user.uid,
          senderName: profile?.displayName || profile?.name || "Me",
          text: textToSend,
          createdAt: { toDate: () => new Date() },
        };
        setAllMessages((prev) => [
          ...prev,
          { id: "msg_s_" + Date.now().toString(), ...fakeMessage },
        ]);

        // Trigger auto reply
        simulateReply(activeContactId, currentActive.name);
        return;
      }

      await addDoc(collection(db, "messages"), {
        participants: [user.uid, activeContactId],
        senderId: user.uid,
        senderName:
          profile?.displayName || profile?.name || user.displayName || "User",
        text: textToSend,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "messages");
    }
  };

  const filteredContacts = computedContacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="h-[calc(100vh-12rem)] min-h-[500px] flex flex-col md:flex-row gap-6 animate-in fade-in duration-500">
      {/* Sidebar */}
      <div className="w-full md:w-80 lg:w-96 flex flex-col bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden shrink-0">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
          <h2 className="text-xl font-semibold text-white mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/50 scroll-smooth">
          {filteredContacts.map((contact) => {
            const hasMessages = contact.messages && contact.messages.length > 0;
            const lastMessage = hasMessages
              ? contact.messages![contact.messages!.length - 1]
              : null;

            return (
              <div
                key={contact.id}
                onClick={() => setActiveContactId(contact.id)}
                className={`p-4 cursor-pointer transition-all relative ${activeContactId === contact.id ? "bg-indigo-500/10 border-l-2 border-indigo-500" : "hover:bg-zinc-800/50 border-l-2 border-transparent"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-medium text-zinc-400">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    {contact.online && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-zinc-900 rounded-full"></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="text-[15px] font-semibold text-zinc-100 truncate pr-2">
                        {contact.name}
                      </h4>
                      {lastMessage && (
                        <span
                          className={`text-[11px] shrink-0 font-medium ${isTyping[contact.id] ? "text-indigo-400" : "text-zinc-500"}`}
                        >
                          {isTyping[contact.id]
                            ? "typing..."
                            : formatRelativeTime(
                                new Date(lastMessage.timestamp),
                              )}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {lastMessage && lastMessage.isMe && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      )}
                      <p
                        className={`text-[13px] truncate ${isTyping[contact.id] ? "text-indigo-300 font-medium" : activeContactId === contact.id ? "text-indigo-200" : "text-zinc-400"}`}
                      >
                        {isTyping[contact.id]
                          ? "..."
                          : lastMessage
                            ? lastMessage.text
                            : "No matching messages"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredContacts.length === 0 && (
            <div className="p-8 text-center text-zinc-500 text-sm">
              No conversations found.
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      {activeContact ? (
        <div className="flex-1 flex flex-col bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden relative shadow-xl">
          <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-900/90 flex justify-between items-center backdrop-blur-xl z-20 sticky top-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-medium text-zinc-400">
                  {activeContact.name.charAt(0).toUpperCase()}
                </div>
                {activeContact.online && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-zinc-900 rounded-full"></span>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-white line-clamp-1">
                  {activeContact.name}
                </h3>
                <p className="text-xs font-medium flex items-center gap-1">
                  {isTyping[activeContact.id] ? (
                    <span className="text-indigo-400">typing...</span>
                  ) : activeContact.online ? (
                    <span className="text-emerald-400">Online</span>
                  ) : (
                    <span className="text-zinc-500">
                      Last active {activeContact.lastActive}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors hidden sm:flex">
                <Phone className="w-5 h-5" />
              </button>
              <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors hidden sm:flex">
                <Video className="w-5 h-5" />
              </button>
              <div className="w-px h-6 bg-zinc-800 mx-1 hidden sm:block"></div>
              <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors">
                <Info className="w-5 h-5" />
              </button>
              <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-zinc-950/20 bg-blend-overlay">
            {/* Timestamp separator for older messages */}
            {activeContact.messages && activeContact.messages.length > 0 && (
              <div className="flex justify-center mb-6">
                <span className="px-3 py-1 bg-zinc-800 text-zinc-400 rounded-full text-xs font-semibold uppercase tracking-wider">
                  {formatRelativeTime(
                    new Date(activeContact.messages[0].timestamp),
                  )}
                </span>
              </div>
            )}

            {activeContact.messages &&
              activeContact.messages.map((msg, index) => {
                const showSender =
                  index === 0 ||
                  activeContact.messages![index - 1].sender !== msg.sender;

                // Determine if we need to show a new date badge
                let showDateSeperator = false;
                if (index > 0) {
                  const prevDate = new Date(
                    activeContact.messages![index - 1].timestamp,
                  ).setHours(0, 0, 0, 0);
                  const currDate = new Date(msg.timestamp).setHours(0, 0, 0, 0);
                  showDateSeperator = prevDate !== currDate;
                }

                return (
                  <React.Fragment key={msg.id}>
                    {showDateSeperator && (
                      <div className="flex justify-center my-6">
                        <span className="px-3 py-1 bg-zinc-800 text-zinc-400 rounded-full text-xs font-semibold uppercase tracking-wider">
                          {formatRelativeTime(new Date(msg.timestamp))}
                        </span>
                      </div>
                    )}

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-col ${msg.isMe ? "items-end" : "items-start"}`}
                    >
                      {showSender && !msg.isMe && (
                        <span className="text-[11px] text-zinc-400 font-semibold mb-1 ml-1">
                          {msg.sender}
                        </span>
                      )}
                      <div
                        className={`px-4 py-2.5 rounded-2xl max-w-[85%] sm:max-w-[70%] shadow-lg ${msg.isMe ? "bg-indigo-600 text-white rounded-br-sm" : "bg-zinc-800 text-zinc-100 rounded-bl-sm border border-zinc-700/50"}`}
                      >
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                          {msg.text}
                        </p>
                      </div>
                      <span className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1 tracking-wide font-medium">
                        {msg.time}
                        {msg.isMe &&
                          (msg.status === "read" ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          ))}
                      </span>
                    </motion.div>
                  </React.Fragment>
                );
              })}

            {(!activeContact.messages ||
              activeContact.messages.length === 0) && (
              <div className="text-center text-zinc-500 text-sm mt-10">
                Send a message to start the conversation with{" "}
                {activeContact.name}.
              </div>
            )}

            {activeContactId && isTyping[activeContactId] && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, originX: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-start"
              >
                <div className="px-5 py-4 rounded-2xl bg-zinc-800 text-zinc-200 rounded-bl-sm border border-zinc-700/50 flex space-x-1.5 items-center h-11 shadow-lg">
                  <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce"></div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} className="h-1" />
          </div>

          <div className="p-3 sm:p-4 border-t border-zinc-800 bg-zinc-950/90 backdrop-blur-xl z-20">
            <div className="flex items-end gap-3 bg-zinc-900 border border-zinc-700/50 focus-within:border-indigo-500/80 rounded-2xl p-1.5 transition-all shadow-inner">
              <button className="p-2.5 text-zinc-400 hover:text-white rounded-xl transition-colors mb-0.5">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Message..."
                className="flex-1 bg-transparent border-none px-2 py-3 text-[15px] text-white placeholder-zinc-500 focus:outline-none resize-none min-h-[48px] max-h-32 leading-relaxed"
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl transition-colors flex items-center justify-center shrink-0 mb-0.5 shadow-md shadow-indigo-900/20"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <div className="flex justify-center mt-2">
              <p className="text-[10px] uppercase font-semibold tracking-widest text-zinc-600">
                End-to-End Encrypted
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-zinc-900/50 border border-zinc-800 rounded-xl text-center p-8 backdrop-blur-sm shadow-xl">
          <div className="w-20 h-20 bg-zinc-800/80 rounded-full flex items-center justify-center mb-6 shadow-inner ring-1 ring-white/5">
            <Search className="w-8 h-8 text-zinc-500" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">
            Your Messages
          </h3>
          <p className="text-zinc-400 max-w-sm">
            Select a conversation from the sidebar or start a new chat with a
            brand collaboration.
          </p>
        </div>
      )}
    </div>
  );
}
