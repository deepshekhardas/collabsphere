import React, { useState, useEffect } from "react";
import { db, auth, storage } from "@/lib/firebase";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import {
  Upload,
  X,
  Loader2,
  Image as ImageIcon,
  Link as LinkIcon,
  Video,
} from "lucide-react";
import { toast } from "sonner";

export function Portfolio() {
  const [portfolioItems, setPortfolioItems] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    if (!auth.currentUser) return;
    const docRef = doc(db, "creatorProfiles", auth.currentUser.uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      setPortfolioItems(snap.data().portfolio || []);
    }
  };

  const savePortfolioItems = async (items: any[]) => {
    if (!auth.currentUser) return;
    const docRef = doc(db, "creatorProfiles", auth.currentUser.uid);
    await updateDoc(docRef, { portfolio: items });
    setPortfolioItems(items);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size must be under 50MB");
      return;
    }

    setUploading(true);
    setProgress(0);

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isVideo && !isImage) {
      toast.error("Only images and videos are allowed.");
      setUploading(false);
      return;
    }

    try {
      const storageRef = ref(
        storage,
        `portfolio/${auth.currentUser.uid}/${Date.now()}_${file.name}`,
      );
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(p);
        },
        (error) => {
          console.error(error);
          toast.error("Upload failed. Storage rules may be locked.");
          setUploading(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const newItem = {
            id: Date.now().toString(),
            url: downloadURL,
            type: isVideo ? "video" : "image",
            name: file.name,
            storagePath: uploadTask.snapshot.ref.fullPath,
          };
          await savePortfolioItems([...portfolioItems, newItem]);
          toast.success("File uploaded to your portfolio!");
          setUploading(false);
        },
      );
    } catch (e: any) {
      console.error(e);
      toast.error("Error setting up upload.");
      setUploading(false);
    }
  };

  const handleDelete = async (item: any) => {
    if (!confirm("Remove this item?")) return;

    try {
      // First try to delete from storage if it exists there
      if (item.storagePath) {
        const fileRef = ref(storage, item.storagePath);
        await deleteObject(fileRef).catch((e) =>
          console.warn("Failed to delete from storage", e),
        );
      }

      const newItems = portfolioItems.filter((i) => i.id !== item.id);
      await savePortfolioItems(newItems);
      toast.success("Item removed");
    } catch (e) {
      console.error(e);
      toast.error("Failed to remove item");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-white">
            Portfolio Showcase
          </h3>
          <p className="text-zinc-400 text-sm mt-1">
            Upload your best work (images or videos) to attract brands.
          </p>
        </div>

        <div className="relative">
          <input
            type="file"
            accept="image/*,video/*"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          <Button
            variant="outline"
            className="bg-zinc-900 border-zinc-700 text-white w-full"
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Uploading {Math.round(progress)}%
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload New File
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {portfolioItems.map((item) => (
          <div
            key={item.id}
            className="relative group rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 aspect-square"
          >
            {item.type === "video" ? (
              <video
                src={item.url}
                className="w-full h-full object-cover"
                controls
                playsInline
              />
            ) : (
              <img
                src={item.url}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            )}

            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4">
              <button
                onClick={() => handleDelete(item)}
                className="mt-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {portfolioItems.length === 0 && !uploading && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/50">
            <ImageIcon className="w-8 h-8 text-zinc-600 mb-4" />
            <p className="text-sm font-medium text-zinc-400">
              No portfolio items yet.
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Upload images or videos directly to Firebase Storage.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
