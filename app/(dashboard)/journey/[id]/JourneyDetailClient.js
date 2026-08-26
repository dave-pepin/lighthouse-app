"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  CheckCircle2,
  Circle,
  ChevronLeft,
  Bell,
  Upload,
  Pencil,
  Check,
  X,
  Calendar,
  ChevronDown,
  GripVertical,
  Trash2,
  Plus,
  Video,
  Sparkles,
  Eye,
} from "lucide-react";
import CourseLine, { stagesForRole, stageLabel } from "@/components/CourseLine";
import { reorderById } from "@/lib/reorder";
import PdfThumbnail from "@/components/PdfThumbnail";
import StageTag from "@/components/StageTag";
import { createClient } from "@/lib/supabase/client";
import {
  saveDraft,
  approveAndSend,
  holdUpdate,
  resumeUpdate,
  scheduleUpdate,
  unscheduleUpdate,
  recordDocument,
  toggleMilestone,
  setMilestoneDueDate,
  setMilestoneNotes,
  setMilestoneClientNotes,
  addMilestone,
  deleteMilestone,
  reorderMilestones,
  inviteClient,
  updateClientInfo,
  startNewUpdate,
  setMilestoneStatus,
  setPropertyAddress,
  createVideo,
  attachVideoToMilestone,
  removeVideoFromMilestone,
  setJourneyStatus,
  suggestUpdateMessage,
  deleteJourney,
  setClientAccess,
  deleteDocument,
  setClosedDate,
  setAnniversaryReminder,
  requestDocument,
  cancelDocumentRequest,
} from "./actions";

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// Closing dates can be from any past year, so unlike formatDate (used for
// recent, contextually-obvious dates elsewhere on this page) this always
// includes the year to stay unambiguous.
function formatDateFull(dateString) {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateString) {
  return new Date(dateString).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isImageFile(name) {
  return /\.(jpe?g|png|gif|webp|heic|bmp|svg)$/i.test(name || "");
}

function isPdfFile(name) {
  return /\.pdf$/i.test(name || "");
}

// A small clickable preview: a real image crop for photos, an actual
// rendered first page for PDFs, or a labeled icon tile as the fallback
// while that renders (or for anything else). An optional onDelete renders
// a small "x" over the corner — kept as a sibling of the <a>, not nested
// inside it, since a button can't legally live inside an anchor.
function DocumentThumbnail({ doc, onDelete, deleting }) {
  const extension = (doc.name.split(".").pop() || "file").toUpperCase();
  return (
    <div style={{ position: "relative", width: 64 }}>
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          disabled={deleting}
          title="Delete document"
          className="lh-focus"
          style={{
            position: "absolute",
            top: -5,
            right: 2,
            zIndex: 1,
            background: "rgba(22, 50, 79, 0.8)",
            border: "none",
            borderRadius: 16,
            width: 18,
            height: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: deleting ? "default" : "pointer",
            padding: 0,
            opacity: deleting ? 0.6 : 1,
          }}
        >
          <X size={11} color="white" />
        </button>
      )}
      <a
        href={doc.url || undefined}
        target="_blank"
        rel="noopener noreferrer"
        title={
          doc.last_viewed_at
            ? `${doc.name} — client opened ${formatDate(doc.last_viewed_at)}`
            : `${doc.name} — not opened by client yet`
        }
        className="lh-focus"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          width: 64,
          textDecoration: "none",
        }}
      >
      {isImageFile(doc.name) ? (
        <img
          src={doc.url}
          alt={doc.name}
          style={{
            width: 56,
            height: 56,
            objectFit: "cover",
            borderRadius: 8,
            border: "1px solid var(--lh-line)",
            background: "var(--lh-fog)",
          }}
        />
      ) : (
        <div style={{ position: "relative", width: 56, height: 56 }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 8,
              border: "1px solid var(--lh-line)",
              background: "var(--lh-fog)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
            }}
          >
            <FileText size={18} color="var(--lh-slate)" strokeWidth={1.6} />
            <span className="lh-mono" style={{ fontSize: 8.5, color: "var(--lh-slate)", fontWeight: 600 }}>
              {extension}
            </span>
          </div>
          {isPdfFile(doc.name) && doc.url && (
            <div style={{ position: "absolute", inset: 0 }}>
              <PdfThumbnail url={doc.url} width={56} height={56} />
            </div>
          )}
        </div>
      )}
      <span
        style={{
          fontSize: 10.5,
          color: "var(--lh-slate)",
          textAlign: "center",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          width: "100%",
        }}
      >
        {doc.name}
      </span>
      </a>
    </div>
  );
}

export default function JourneyDetailClient({
  journey,
  milestones,
  documents,
  latestUpdate,
  videoLibrary,
  clientAccess,
  documentRequests,
  canSendMessages = true,
}) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const [isPending, startTransition] = useTransition();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(latestUpdate?.draft_text || "");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sendError, setSendError] = useState("");
  const [expandedMilestoneId, setExpandedMilestoneId] = useState(null);
  const [noteDrafts, setNoteDrafts] = useState({});
  const [clientNoteDrafts, setClientNoteDrafts] = useState({});
  // Local copy of the milestone order so a drag can reorder rows live;
  // it re-syncs from the server-provided prop once the reorder is saved
  // and the page revalidates.
  const [orderedMilestones, setOrderedMilestones] = useState(milestones);
  // Display-only alternate view — never written back to orderedMilestones
  // or persisted via reorderMilestones, so switching to "Due Date" here
  // has no effect on sort_order (or on what the client portal shows,
  // since that's a completely separate query or the same agent).
  const [sortMode, setSortMode] = useState("manual");
  const [draggedMilestoneId, setDraggedMilestoneId] = useState(null);
  const [dragOverMilestoneId, setDragOverMilestoneId] = useState(null);
  // Mirrors draggedMilestoneId synchronously so dragover/drop can read it
  // immediately, without waiting on a React re-render mid-drag.
  const draggedMilestoneIdRef = useRef(null);
  // Native HTML5 drag-and-drop only lets the draggable element itself
  // start a drag, so this gates dragstart to mousedowns that began on the
  // grip handle rather than anywhere else in the row (date input, etc.).
  const dragHandleActiveRef = useRef(false);

  useEffect(() => {
    setOrderedMilestones(milestones);
  }, [milestones]);
  const [newLabel, setNewLabel] = useState("");
  const journeyStages = stagesForRole(journey.role);
  // The status badge shows what's actually current in the Captain's Log —
  // the next not-yet-done milestone — instead of just the broad stage
  // name, so it stays meaningful as items get checked off within a stage.
  const currentMilestoneLabel = milestones.find((m) => !m.done)?.label;
  const [newStage, setNewStage] = useState(
    journey.stage === "Harbor" ? journeyStages[journeyStages.length - 2] : journey.stage
  );
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [invitingClient, setInvitingClient] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteFailed, setInviteFailed] = useState(false);
  const [confirmingInvite, setConfirmingInvite] = useState(false);

  const [editingClient, setEditingClient] = useState(false);
  const [clientNameDraft, setClientNameDraft] = useState(journey.client_name);
  const [clientEmailDraft, setClientEmailDraft] = useState(journey.client_email || "");
  const [clientPhoneDraft, setClientPhoneDraft] = useState(journey.client_phone || "");
  const [clientEmail2Draft, setClientEmail2Draft] = useState(journey.client_email_2 || "");
  const [clientPhone2Draft, setClientPhone2Draft] = useState(journey.client_phone_2 || "");
  const [updatePreferenceDraft, setUpdatePreferenceDraft] = useState(journey.update_preference);
  const [clientInfoError, setClientInfoError] = useState("");
  const [savingClientInfo, setSavingClientInfo] = useState(false);
  const [uploadTargetMilestoneId, setUploadTargetMilestoneId] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [uploadErrorTargetId, setUploadErrorTargetId] = useState(null);

  const [editingAddress, setEditingAddress] = useState(false);
  const [addressDraft, setAddressDraft] = useState(journey.property_address || "");

  const [editingClosedDate, setEditingClosedDate] = useState(false);
  const [closedDateDraft, setClosedDateDraft] = useState(journey.closed_at || "");

  const [editingStatus, setEditingStatus] = useState(false);
  const [statusLevelDraft, setStatusLevelDraft] = useState(journey.status_level || "on_course");
  const [guidanceNoteDraft, setGuidanceNoteDraft] = useState(journey.guidance_note || "");
  const [savingStatus, setSavingStatus] = useState(false);

  const [videoPickerOpenId, setVideoPickerOpenId] = useState(null);
  const [selectedExistingVideoId, setSelectedExistingVideoId] = useState("");
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUploadTargetMilestoneId, setVideoUploadTargetMilestoneId] = useState(null);
  const [videoError, setVideoError] = useState("");
  const [videoErrorTargetId, setVideoErrorTargetId] = useState(null);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingJourney, setDeletingJourney] = useState(false);
  const [deleteJourneyError, setDeleteJourneyError] = useState("");

  const [updatingClientAccess, setUpdatingClientAccess] = useState(false);
  const [clientAccessError, setClientAccessError] = useState("");
  const [confirmingRevokeAccess, setConfirmingRevokeAccess] = useState(false);

  const [deletingDocumentId, setDeletingDocumentId] = useState(null);
  const [documentError, setDocumentError] = useState("");

  const [requestingDocument, setRequestingDocument] = useState(false);
  const [newRequestLabel, setNewRequestLabel] = useState("");
  const [requestingDocumentPending, setRequestingDocumentPending] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [cancelingRequestId, setCancelingRequestId] = useState(null);

  const approved = latestUpdate?.status === "sent";
  const held = latestUpdate?.status === "held";
  const scheduled = latestUpdate?.status === "scheduled";
  const [schedulingOpen, setSchedulingOpen] = useState(false);
  const [scheduleValue, setScheduleValue] = useState("");
  const [scheduleError, setScheduleError] = useState("");

  const handleSaveDraft = () => {
    if (!latestUpdate) return;
    startTransition(() => saveDraft(latestUpdate.id, journey.id, draft));
    setEditing(false);
  };

  const handleSuggestMessage = async () => {
    setSuggesting(true);
    setSuggestError("");
    try {
      const suggestion = await suggestUpdateMessage(journey.id);
      setDraft(suggestion);
      setEditing(true);
    } catch (err) {
      setSuggestError(err.message || "Couldn't generate a suggestion.");
    }
    setSuggesting(false);
  };

  const handleDeleteJourney = async () => {
    if (deleteConfirmText.trim().toLowerCase() !== journey.client_name.trim().toLowerCase()) {
      return;
    }
    setDeletingJourney(true);
    setDeleteJourneyError("");
    try {
      await deleteJourney(journey.id);
      router.push("/bridge");
    } catch (err) {
      setDeleteJourneyError(err.message || "Couldn't delete this Journey.");
      setDeletingJourney(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm("Delete this document? This can't be undone.")) return;
    setDeletingDocumentId(documentId);
    setDocumentError("");
    try {
      await deleteDocument(documentId, journey.id);
      router.refresh();
    } catch (err) {
      setDocumentError(err.message || "Couldn't delete that document.");
    }
    setDeletingDocumentId(null);
  };

  const handleRequestDocument = async () => {
    const label = newRequestLabel.trim();
    if (!label) return;
    setRequestingDocumentPending(true);
    setRequestError("");
    try {
      const { errors } = await requestDocument(journey.id, label);
      if (errors.length > 0) {
        setRequestError(errors.join(" "));
      } else {
        setNewRequestLabel("");
        setRequestingDocument(false);
      }
      router.refresh();
    } catch (err) {
      setRequestError(err.message || "Couldn't send that request.");
    }
    setRequestingDocumentPending(false);
  };

  const handleCancelRequest = async (requestId) => {
    setCancelingRequestId(requestId);
    try {
      await cancelDocumentRequest(requestId, journey.id);
      router.refresh();
    } catch (err) {
      setRequestError(err.message || "Couldn't cancel that request.");
    }
    setCancelingRequestId(null);
  };

  const handleToggleClientAccess = async (revoke) => {
    setUpdatingClientAccess(true);
    setClientAccessError("");
    try {
      await setClientAccess(journey.id, revoke);
      setConfirmingRevokeAccess(false);
      router.refresh();
    } catch (err) {
      setClientAccessError(err.message || "Couldn't update the client's access.");
    }
    setUpdatingClientAccess(false);
  };

  const handleApprove = () => {
    if (!latestUpdate) return;
    setSendError("");
    startTransition(async () => {
      try {
        await approveAndSend(latestUpdate.id, journey.id);
      } catch (err) {
        setSendError(err.message || "Something went wrong sending this update.");
      }
    });
  };

  const handleHold = () => {
    if (!latestUpdate) return;
    startTransition(() => holdUpdate(latestUpdate.id, journey.id));
  };

  const handleSchedule = () => {
    if (!latestUpdate || !scheduleValue) return;
    setScheduleError("");
    // scheduleValue is a timezone-less "datetime-local" string (e.g.
    // "2026-08-25T14:30") — new Date() here correctly reads it as the
    // browser's own local time, so converting to an ISO string now (with
    // an explicit UTC offset) is what makes it parse the same way
    // wherever the server happens to run, instead of being re-read as
    // UTC on a server that isn't in the visitor's timezone.
    const sendAtIso = new Date(scheduleValue).toISOString();
    startTransition(async () => {
      try {
        await scheduleUpdate(latestUpdate.id, journey.id, sendAtIso);
        setSchedulingOpen(false);
      } catch (err) {
        setScheduleError(err.message || "Couldn't schedule this update.");
      }
    });
  };

  const handleUnschedule = () => {
    if (!latestUpdate) return;
    startTransition(() => unscheduleUpdate(latestUpdate.id, journey.id));
  };

  const handleResume = () => {
    if (!latestUpdate) return;
    startTransition(() => resumeUpdate(latestUpdate.id, journey.id));
  };

  const handleToggleMilestone = (e, m) => {
    e.stopPropagation();
    startTransition(() => toggleMilestone(m.id, journey.id, !m.done));
  };

  const handleDueDateChange = (e, m, value) => {
    e.stopPropagation();
    startTransition(() => setMilestoneDueDate(m.id, journey.id, value));
  };

  const handleMilestoneStatusChange = (e, m, value) => {
    e.stopPropagation();
    startTransition(() => setMilestoneStatus(m.id, journey.id, value));
  };

  const toggleExpanded = (m) => {
    setExpandedMilestoneId((current) => (current === m.id ? null : m.id));
    setNoteDrafts((prev) =>
      prev[m.id] !== undefined ? prev : { ...prev, [m.id]: m.notes || "" }
    );
    setClientNoteDrafts((prev) =>
      prev[m.id] !== undefined ? prev : { ...prev, [m.id]: m.client_notes || "" }
    );
  };

  const handleSaveNotes = (m) => {
    startTransition(() => setMilestoneNotes(m.id, journey.id, noteDrafts[m.id] || ""));
  };

  const handleSaveClientNotes = (m) => {
    startTransition(() => setMilestoneClientNotes(m.id, journey.id, clientNoteDrafts[m.id] || ""));
  };

  const handleAddMilestone = () => {
    const label = newLabel.trim();
    if (!label) return;
    startTransition(() => addMilestone(journey.id, label, newStage));
    setNewLabel("");
    setAddingMilestone(false);
  };

  const handleDeleteMilestone = (e, m) => {
    e.stopPropagation();
    startTransition(() => deleteMilestone(m.id, journey.id));
  };

  const handleMilestoneDragStart = (e, m) => {
    if (!dragHandleActiveRef.current) {
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    draggedMilestoneIdRef.current = m.id;
    setDraggedMilestoneId(m.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleMilestoneDragOver = (e, m) => {
    // Always preventDefault, even before React has re-rendered with the
    // dragged id (draggedMilestoneIdRef is set synchronously in
    // dragstart, ahead of the state) — dragover fires continuously while
    // hovering, and the browser only allows a drop if the *most recent*
    // dragover on the current target called preventDefault. Gating this
    // on state instead let a fast drag miss every dragover before the
    // re-render landed, so the drop was silently rejected.
    e.preventDefault();
    e.stopPropagation();
    if (!draggedMilestoneIdRef.current || draggedMilestoneIdRef.current === m.id) return;
    setDragOverMilestoneId(m.id);
  };

  const handleMilestoneDrop = (e, m) => {
    e.preventDefault();
    e.stopPropagation();
    const fromId = draggedMilestoneIdRef.current;
    draggedMilestoneIdRef.current = null;
    setDraggedMilestoneId(null);
    setDragOverMilestoneId(null);
    if (!fromId || fromId === m.id) return;

    const reordered = reorderById(orderedMilestones, fromId, m.id);
    if (reordered === orderedMilestones) return;

    setOrderedMilestones(reordered);
    startTransition(() => reorderMilestones(journey.id, reordered.map((row) => row.id)));
  };

  const handleMilestoneDragEnd = () => {
    dragHandleActiveRef.current = false;
    draggedMilestoneIdRef.current = null;
    setDraggedMilestoneId(null);
    setDragOverMilestoneId(null);
  };

  const handleOpenVideoPicker = (e, milestoneId) => {
    e.stopPropagation();
    setVideoPickerOpenId(milestoneId);
    setSelectedExistingVideoId("");
    setNewVideoTitle("");
    setVideoError("");
  };

  const handleCancelVideoPicker = (e) => {
    e.stopPropagation();
    setVideoPickerOpenId(null);
  };

  const handleAttachExistingVideo = (e, milestoneId) => {
    e.stopPropagation();
    if (!selectedExistingVideoId) return;
    startTransition(() => attachVideoToMilestone(milestoneId, journey.id, selectedExistingVideoId));
    setVideoPickerOpenId(null);
    setSelectedExistingVideoId("");
  };

  const handleVideoUploadClick = (e, milestoneId) => {
    e.stopPropagation();
    setVideoUploadTargetMilestoneId(milestoneId);
    videoInputRef.current?.click();
  };

  const handleVideoFileChange = async (e) => {
    const file = e.target.files?.[0];
    const milestoneId = videoUploadTargetMilestoneId;
    if (!file || !milestoneId) return;
    setUploadingVideo(true);
    setVideoError("");
    setVideoErrorTargetId(null);
    try {
      const path = `${journey.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("milestone-videos")
        .upload(path, file);
      if (uploadError) {
        throw new Error(uploadError.message || "Couldn't upload that video.");
      }
      const video = await createVideo(newVideoTitle || file.name, path);
      await attachVideoToMilestone(milestoneId, journey.id, video.id);
      router.refresh();
      setVideoPickerOpenId(null);
      setNewVideoTitle("");
    } catch (err) {
      setVideoError(err.message || "Couldn't upload that video.");
      setVideoErrorTargetId(milestoneId);
    }
    setUploadingVideo(false);
    setVideoUploadTargetMilestoneId(null);
    e.target.value = "";
  };

  const handleRemoveVideo = (e, m) => {
    e.stopPropagation();
    startTransition(() => removeVideoFromMilestone(m.id, journey.id));
  };

  const handleInviteClient = async () => {
    setInvitingClient(true);
    setInviteMessage("");
    setInviteFailed(false);
    try {
      await inviteClient(journey.id);
      setInviteMessage(
        journey.client_user_id
          ? "Sent them a fresh login link."
          : "Invite sent! They'll get an email to set up their account."
      );
      setConfirmingInvite(false);
      router.refresh();
    } catch (err) {
      setInviteMessage(err.message || "Couldn't send the invite.");
      setInviteFailed(true);
    }
    setInvitingClient(false);
  };

  const handleSaveClientInfo = async () => {
    setSavingClientInfo(true);
    setClientInfoError("");
    try {
      await updateClientInfo(journey.id, {
        clientName: clientNameDraft,
        clientEmail: clientEmailDraft,
        clientPhone: clientPhoneDraft,
        clientEmail2: clientEmail2Draft,
        clientPhone2: clientPhone2Draft,
        updatePreference: updatePreferenceDraft,
      });
      setEditingClient(false);
      router.refresh();
    } catch (err) {
      setClientInfoError(err.message || "Couldn't save those changes.");
    }
    setSavingClientInfo(false);
  };

  const handleCancelClientInfo = () => {
    setClientNameDraft(journey.client_name);
    setClientEmailDraft(journey.client_email || "");
    setClientPhoneDraft(journey.client_phone || "");
    setClientEmail2Draft(journey.client_email_2 || "");
    setClientPhone2Draft(journey.client_phone_2 || "");
    setUpdatePreferenceDraft(journey.update_preference);
    setClientInfoError("");
    setEditingClient(false);
  };

  const handleSaveStatus = async () => {
    setSavingStatus(true);
    try {
      await setJourneyStatus(journey.id, statusLevelDraft, guidanceNoteDraft);
      setEditingStatus(false);
      router.refresh();
    } catch (err) {
      // Status updates are low-stakes enough that a console log is fine
      // here — there's no dedicated error UI in this small popover.
      console.error(err);
    }
    setSavingStatus(false);
  };

  const handleCancelStatus = () => {
    setStatusLevelDraft(journey.status_level || "on_course");
    setGuidanceNoteDraft(journey.guidance_note || "");
    setEditingStatus(false);
  };

  const handleStartNewUpdate = () => {
    startTransition(async () => {
      try {
        await startNewUpdate(journey.id);
        // Put the UI straight into edit mode with an empty draft — the new
        // row in the database really is empty, so this avoids showing
        // last week's message and matches what "Approve & Send" will
        // actually see.
        setDraft("");
        setEditing(true);
        setSendError("");
        router.refresh();
      } catch (err) {
        setSendError(err.message || "Couldn't start a new update.");
      }
    });
  };

  const handleUploadClick = (milestoneId = null) => {
    setUploadTargetMilestoneId(milestoneId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    setUploadErrorTargetId(null);
    try {
      const path = `${journey.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, file);
      if (uploadError) {
        throw new Error(uploadError.message || "Couldn't upload that file.");
      }
      await recordDocument(journey.id, file.name, path, uploadTargetMilestoneId);
      router.refresh();
    } catch (err) {
      setUploadError(err.message || "Couldn't upload that file.");
      setUploadErrorTargetId(uploadTargetMilestoneId);
    }
    setUploading(false);
    setUploadTargetMilestoneId(null);
    e.target.value = "";
  };

  const handleSaveAddress = () => {
    startTransition(() => setPropertyAddress(journey.id, addressDraft));
    setEditingAddress(false);
  };

  const handleCancelAddress = () => {
    setAddressDraft(journey.property_address || "");
    setEditingAddress(false);
  };

  const handleSaveClosedDate = () => {
    startTransition(() => setClosedDate(journey.id, closedDateDraft));
    setEditingClosedDate(false);
  };

  const handleCancelClosedDate = () => {
    setClosedDateDraft(journey.closed_at || "");
    setEditingClosedDate(false);
  };

  const handleToggleReminder = (e) => {
    startTransition(() => setAnniversaryReminder(journey.id, e.target.checked));
  };

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "36px 32px 60px" }}>
      {!canSendMessages && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 14px",
            background: "var(--lh-navy)",
            color: "white",
            fontSize: 12.5,
            borderRadius: 8,
            marginBottom: 18,
          }}
        >
          <Eye size={13} />
          You&apos;re covering this agency — sending messages (invites, updates, document requests) is
          disabled.
        </div>
      )}
      <button
        onClick={() => router.back()}
        className="lh-focus"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--lh-slate)",
          fontSize: 13,
          padding: 0,
          marginBottom: 22,
        }}
      >
        <ChevronLeft size={15} /> Back to the Bridge
      </button>

      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="lh-display" style={{ fontSize: 26, fontWeight: 600, margin: 0, overflowWrap: "break-word" }}>
            {journey.client_name}
          </h1>
          <div style={{ fontSize: 13, color: "var(--lh-slate)", marginTop: 2 }}>{journey.role}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {!editingClient && (
            <button
              onClick={() => setEditingClient(true)}
              className="lh-focus"
              title="Edit client info"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "none",
                border: "1px solid var(--lh-line)",
                borderRadius: 7,
                padding: "4px 10px",
                fontSize: 12,
                color: "var(--lh-slate)",
                cursor: "pointer",
              }}
            >
              <Pencil size={12} /> Edit info
            </button>
          )}
          <button
            onClick={() => setEditingStatus((cur) => !cur)}
            className="lh-focus"
            title="Update status"
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}
          >
            <StageTag stage={journey.stage} statusLevel={journey.status_level} currentLabel={currentMilestoneLabel} />
          </button>
        </div>
      </div>

      {editingStatus && (
        <div
          style={{
            background: "var(--lh-paper)",
            border: "1px solid var(--lh-line)",
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 16,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--lh-slate)", display: "block", marginBottom: 4 }}>
              Status
            </label>
            <select
              value={statusLevelDraft}
              onChange={(e) => setStatusLevelDraft(e.target.value)}
              className="lh-focus"
              style={{
                width: "100%",
                border: "1px solid var(--lh-line)",
                borderRadius: 7,
                padding: "7px 9px",
                fontSize: 13.5,
                fontFamily: "inherit",
                color: "var(--lh-navy)",
              }}
            >
              <option value="on_course">On Course</option>
              <option value="caution">Needs Correction</option>
              <option value="danger">In Danger</option>
            </select>
          </div>
          {statusLevelDraft !== "on_course" && (
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--lh-slate)", display: "block", marginBottom: 4 }}>
                What&apos;s going on? (shown to you, not the client)
              </label>
              <textarea
                value={guidanceNoteDraft}
                onChange={(e) => setGuidanceNoteDraft(e.target.value)}
                placeholder="e.g. Buyer's financing fell through, waiting on updated pre-approval"
                className="lh-focus"
                style={{
                  width: "100%",
                  minHeight: 60,
                  border: "1px solid var(--lh-line)",
                  borderRadius: 7,
                  padding: "7px 9px",
                  fontSize: 13,
                  fontFamily: "inherit",
                  color: "var(--lh-navy)",
                  resize: "vertical",
                }}
              />
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleSaveStatus}
              disabled={savingStatus}
              className="lh-focus"
              style={{ background: "var(--lh-navy)", color: "white", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13, cursor: "pointer", opacity: savingStatus ? 0.7 : 1 }}
            >
              {savingStatus ? "Saving..." : "Save"}
            </button>
            <button
              onClick={handleCancelStatus}
              disabled={savingStatus}
              className="lh-focus"
              style={{ background: "none", border: "1px solid var(--lh-line)", borderRadius: 8, padding: "7px 14px", fontSize: 13, color: "var(--lh-slate)", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {editingClient ? (
        <div
          style={{
            background: "var(--lh-paper)",
            border: "1px solid var(--lh-line)",
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 16,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 160px", minWidth: 0 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--lh-slate)", display: "block", marginBottom: 4 }}>
                Client name
              </label>
              <input
                value={clientNameDraft}
                onChange={(e) => setClientNameDraft(e.target.value)}
                className="lh-focus"
                style={{ width: "100%", border: "1px solid var(--lh-line)", borderRadius: 7, padding: "7px 9px", fontSize: 13.5, fontFamily: "inherit" }}
              />
            </div>
            <div style={{ flex: "1 1 160px", minWidth: 0 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--lh-slate)", display: "block", marginBottom: 4 }}>
                Updates via
              </label>
              <select
                value={updatePreferenceDraft}
                onChange={(e) => setUpdatePreferenceDraft(e.target.value)}
                className="lh-focus"
                style={{ width: "100%", border: "1px solid var(--lh-line)", borderRadius: 7, padding: "7px 9px", fontSize: 13.5, fontFamily: "inherit", color: "var(--lh-slate)" }}
              >
                <option value="email">Email only</option>
                <option value="sms">Text only</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 160px", minWidth: 0 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--lh-slate)", display: "block", marginBottom: 4 }}>
                Client email
              </label>
              <input
                type="email"
                value={clientEmailDraft}
                onChange={(e) => setClientEmailDraft(e.target.value)}
                placeholder="client@example.com"
                className="lh-focus"
                style={{ width: "100%", border: "1px solid var(--lh-line)", borderRadius: 7, padding: "7px 9px", fontSize: 13.5, fontFamily: "inherit" }}
              />
            </div>
            <div style={{ flex: "1 1 160px", minWidth: 0 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--lh-slate)", display: "block", marginBottom: 4 }}>
                Client phone
              </label>
              <input
                type="tel"
                value={clientPhoneDraft}
                onChange={(e) => setClientPhoneDraft(e.target.value)}
                placeholder="555-123-4567"
                className="lh-focus"
                style={{ width: "100%", border: "1px solid var(--lh-line)", borderRadius: 7, padding: "7px 9px", fontSize: 13.5, fontFamily: "inherit" }}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 160px", minWidth: 0 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--lh-slate)", display: "block", marginBottom: 4 }}>
                Additional email <span style={{ fontWeight: 400, color: "var(--lh-slate-light)" }}>(optional)</span>
              </label>
              <input
                type="email"
                value={clientEmail2Draft}
                onChange={(e) => setClientEmail2Draft(e.target.value)}
                placeholder="e.g. spouse@example.com"
                className="lh-focus"
                style={{ width: "100%", border: "1px solid var(--lh-line)", borderRadius: 7, padding: "7px 9px", fontSize: 13.5, fontFamily: "inherit" }}
              />
            </div>
            <div style={{ flex: "1 1 160px", minWidth: 0 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--lh-slate)", display: "block", marginBottom: 4 }}>
                Additional phone <span style={{ fontWeight: 400, color: "var(--lh-slate-light)" }}>(optional)</span>
              </label>
              <input
                type="tel"
                value={clientPhone2Draft}
                onChange={(e) => setClientPhone2Draft(e.target.value)}
                placeholder="555-123-4567"
                className="lh-focus"
                style={{ width: "100%", border: "1px solid var(--lh-line)", borderRadius: 7, padding: "7px 9px", fontSize: 13.5, fontFamily: "inherit" }}
              />
            </div>
          </div>
          <p style={{ fontSize: 11.5, color: "var(--lh-slate-light)", margin: "-4px 0 0" }}>
            Both contacts get every update and invite — the portal login itself is still tied to the
            primary email above.
          </p>
          {clientInfoError && <div style={{ fontSize: 12.5, color: "#B4472A" }}>{clientInfoError}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleSaveClientInfo}
              disabled={savingClientInfo}
              className="lh-focus"
              style={{ background: "var(--lh-navy)", color: "white", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13, cursor: "pointer", opacity: savingClientInfo ? 0.7 : 1 }}
            >
              {savingClientInfo ? "Saving..." : "Save"}
            </button>
            <button
              onClick={handleCancelClientInfo}
              disabled={savingClientInfo}
              className="lh-focus"
              style={{ background: "none", border: "1px solid var(--lh-line)", borderRadius: 8, padding: "7px 14px", fontSize: 13, color: "var(--lh-slate)", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
        {journey.client_user_id && journey.client_activated_at ? (
          <span
            className="lh-mono"
            title={`Set up their login on ${formatDate(journey.client_activated_at)}`}
            style={{ fontSize: 11, color: "var(--lh-teal)", display: "flex", alignItems: "center", gap: 4 }}
          >
            <Check size={12} /> Portal activated {formatDate(journey.client_activated_at)}
          </span>
        ) : journey.client_user_id ? (
          <span
            className="lh-mono"
            style={{ fontSize: 11, color: "var(--lh-gold)", display: "flex", alignItems: "center", gap: 4 }}
          >
            <Bell size={12} /> Invited — not yet activated
          </span>
        ) : (
          <span className="lh-mono" style={{ fontSize: 11, color: "var(--lh-slate-light)" }}>
            No portal access yet
          </span>
        )}
        {!confirmingInvite ? (
          <button
            onClick={() => setConfirmingInvite(true)}
            disabled={invitingClient || !journey.client_email || !canSendMessages}
            className="lh-focus"
            style={{
              background: "none",
              border: "1px solid var(--lh-line)",
              borderRadius: 7,
              padding: "3px 9px",
              fontSize: 11.5,
              color: "var(--lh-slate)",
              cursor: journey.client_email && canSendMessages ? "pointer" : "default",
              opacity: invitingClient || !canSendMessages ? 0.6 : 1,
            }}
            title={
              !canSendMessages
                ? "Sending messages is disabled while covering another agency"
                : !journey.client_email
                ? "Add a client email first"
                : undefined
            }
          >
            {journey.client_user_id ? "Resend login link" : "Invite client to portal"}
          </button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11.5, color: "var(--lh-slate)" }}>
              {journey.client_user_id ? "Send a fresh login link now?" : "Send the invite now?"}
            </span>
            <button
              onClick={handleInviteClient}
              disabled={invitingClient}
              className="lh-focus"
              style={{
                background: "var(--lh-navy)",
                color: "white",
                border: "none",
                borderRadius: 7,
                padding: "3px 10px",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: invitingClient ? "default" : "pointer",
                opacity: invitingClient ? 0.6 : 1,
              }}
            >
              {invitingClient ? "Sending..." : "Confirm send"}
            </button>
            <button
              onClick={() => setConfirmingInvite(false)}
              disabled={invitingClient}
              className="lh-focus"
              style={{
                background: "none",
                border: "1px solid var(--lh-line)",
                borderRadius: 7,
                padding: "3px 10px",
                fontSize: 11.5,
                color: "var(--lh-slate)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        )}
        {inviteMessage && (
          <span style={{ fontSize: 11.5, color: inviteFailed ? "var(--lh-red)" : "var(--lh-slate)" }}>{inviteMessage}</span>
        )}
      </div>
      )}

      {clientAccess?.lastSignInAt && (
        <div style={{ fontSize: 11, color: "var(--lh-slate-light)", marginBottom: 4 }}>
          Client last logged in {formatDate(clientAccess.lastSignInAt)}
        </div>
      )}

      <a
        href={`/journey-preview/${journey.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="lh-focus"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: 11.5,
          color: "var(--lh-teal)",
          textDecoration: "none",
          marginBottom: 4,
        }}
      >
        <Eye size={12} /> Preview their portal
      </a>

      <div style={{ margin: "22px 0 8px" }}>
        <CourseLine stageIndex={journey.stage_index} statusLevel={journey.status_level} role={journey.role} />
      </div>

      {journey.status_level !== "on_course" && journey.guidance_note && (
        <div
          style={{
            background: journey.status_level === "danger" ? "var(--lh-red-soft)" : "var(--lh-gold-soft)",
            border: journey.status_level === "danger" ? "1px solid #E5C3B4" : "1px solid #E8CE93",
            borderRadius: 10,
            padding: "12px 14px",
            fontSize: 13.5,
            color: journey.status_level === "danger" ? "var(--lh-red)" : "#5C4508",
            margin: "18px 0",
            display: "flex",
            gap: 8,
          }}
        >
          <Bell size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{journey.guidance_note}</span>
        </div>
      )}

      {/* Property address */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "var(--lh-paper)",
          border: "1px solid var(--lh-line)",
          borderRadius: 14,
          padding: "14px 20px",
          marginBottom: 20,
        }}
      >
        {editingAddress ? (
          <>
            <input
              autoFocus
              value={addressDraft}
              onChange={(e) => setAddressDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveAddress()}
              placeholder="123 Main St, Springfield"
              className="lh-focus lh-display"
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 15.5,
                fontWeight: 600,
                border: "1px solid var(--lh-line)",
                borderRadius: 8,
                padding: "6px 10px",
                fontFamily: "inherit",
                color: "var(--lh-navy)",
              }}
            />
            <button
              onClick={handleSaveAddress}
              disabled={isPending}
              className="lh-focus"
              title="Save"
              style={{ background: "none", border: "none", padding: 4, cursor: "pointer", display: "flex" }}
            >
              <Check size={16} color="var(--lh-teal)" />
            </button>
            <button
              onClick={handleCancelAddress}
              className="lh-focus"
              title="Cancel"
              style={{ background: "none", border: "none", padding: 4, cursor: "pointer", display: "flex" }}
            >
              <X size={16} color="var(--lh-slate)" />
            </button>
          </>
        ) : (
          <>
            <span
              className="lh-display"
              style={{
                fontSize: 15.5,
                fontWeight: 600,
                color: journey.property_address ? "var(--lh-navy)" : "var(--lh-slate-light)",
                flex: 1,
              }}
            >
              {journey.property_address || "Add the property address"}
            </span>
            <button
              onClick={() => setEditingAddress(true)}
              className="lh-focus"
              title="Edit address"
              style={{ background: "none", border: "none", padding: 4, cursor: "pointer", display: "flex" }}
            >
              <Pencil size={14} color="var(--lh-slate)" />
            </button>
          </>
        )}
      </div>

      {journey.stage === "Harbor" && (
        <div
          style={{
            background: "var(--lh-paper)",
            border: "1px solid var(--lh-line)",
            borderRadius: 14,
            padding: "14px 20px",
            marginBottom: 20,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--lh-slate)" }}>Closing date</span>
            {editingClosedDate ? (
              <>
                <input
                  autoFocus
                  type="date"
                  value={closedDateDraft}
                  onChange={(e) => setClosedDateDraft(e.target.value)}
                  className="lh-focus"
                  style={{
                    border: "1px solid var(--lh-line)",
                    borderRadius: 7,
                    padding: "5px 8px",
                    fontSize: 13,
                    fontFamily: "inherit",
                  }}
                />
                <button
                  onClick={handleSaveClosedDate}
                  disabled={isPending}
                  className="lh-focus"
                  title="Save"
                  style={{ background: "none", border: "none", padding: 4, cursor: "pointer", display: "flex" }}
                >
                  <Check size={15} color="var(--lh-teal)" />
                </button>
                <button
                  onClick={handleCancelClosedDate}
                  className="lh-focus"
                  title="Cancel"
                  style={{ background: "none", border: "none", padding: 4, cursor: "pointer", display: "flex" }}
                >
                  <X size={15} color="var(--lh-slate)" />
                </button>
              </>
            ) : (
              <>
                <span
                  className="lh-display"
                  style={{
                    fontSize: 14.5,
                    fontWeight: 600,
                    color: journey.closed_at ? "var(--lh-navy)" : "var(--lh-slate-light)",
                  }}
                >
                  {journey.closed_at ? formatDateFull(journey.closed_at) : "Not set"}
                </span>
                <button
                  onClick={() => setEditingClosedDate(true)}
                  className="lh-focus"
                  title="Edit closing date"
                  style={{ background: "none", border: "none", padding: 2, cursor: "pointer", display: "flex" }}
                >
                  <Pencil size={13} color="var(--lh-slate)" />
                </button>
              </>
            )}
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontSize: 12.5,
              color: "var(--lh-slate)",
              cursor: journey.closed_at ? "pointer" : "default",
            }}
          >
            <input
              type="checkbox"
              checked={!!journey.anniversary_reminder_enabled}
              onChange={handleToggleReminder}
              disabled={!journey.closed_at || isPending}
            />
            Remind me a week before their closing anniversary each year
          </label>
          {!journey.closed_at && (
            <span style={{ fontSize: 11.5, color: "var(--lh-slate-light)" }}>Set a closing date first.</span>
          )}
        </div>
      )}

      {/* Weekly update approval */}
      {journey.stage !== "Harbor" && latestUpdate && (
        <section style={{ background: "var(--lh-paper)", border: "1px solid var(--lh-line)", borderRadius: 14, padding: "18px 20px", marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
            <h2 className="lh-display" style={{ fontSize: 15.5, fontWeight: 600, margin: 0 }}>
              This Week&apos;s Update
            </h2>
            {!approved && (
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <button
                  onClick={handleSuggestMessage}
                  disabled={suggesting}
                  className="lh-focus"
                  title="Suggest a message based on recent progress"
                  style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "var(--lh-teal)", fontSize: 12.5, cursor: suggesting ? "default" : "pointer", opacity: suggesting ? 0.6 : 1 }}
                >
                  <Sparkles size={12} /> {suggesting ? "Thinking..." : "Suggest"}
                </button>
                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="lh-focus"
                    style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "var(--lh-slate)", fontSize: 12.5, cursor: "pointer" }}
                  >
                    <Pencil size={12} /> Edit
                  </button>
                )}
              </div>
            )}
          </div>
          {suggestError && (
            <div style={{ fontSize: 12, color: "#B4472A", marginBottom: 10 }}>{suggestError}</div>
          )}

          {editing ? (
            <div>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="lh-focus"
                style={{
                  width: "100%",
                  minHeight: 80,
                  border: "1px solid var(--lh-line)",
                  borderRadius: 9,
                  padding: 10,
                  fontSize: 13.5,
                  fontFamily: "inherit",
                  color: "var(--lh-navy)",
                  resize: "vertical",
                }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={handleSaveDraft} className="lh-focus" style={{ background: "var(--lh-navy)", color: "white", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13, cursor: "pointer" }}>
                  Save
                </button>
                <button onClick={() => { setEditing(false); setDraft(latestUpdate.draft_text); }} className="lh-focus" style={{ background: "none", border: "1px solid var(--lh-line)", borderRadius: 8, padding: "7px 14px", fontSize: 13, color: "var(--lh-slate)", cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 14, lineHeight: 1.55, color: "var(--lh-navy-soft)", margin: "0 0 14px" }}>
                {draft || "No draft yet for this week."}
              </p>
              {approved ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--lh-teal)", fontSize: 13.5, fontWeight: 600 }}>
                    <Check size={16} /> Sent to {journey.client_name.split(" ")[0]} via {latestUpdate.sent_via}
                    {latestUpdate.sent_at && (
                      <span style={{ fontWeight: 400, color: "var(--lh-slate)" }}>
                        on {formatDate(latestUpdate.sent_at)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleStartNewUpdate}
                    disabled={isPending}
                    className="lh-focus"
                    style={{ alignSelf: "flex-start", background: "none", border: "1px solid var(--lh-line)", borderRadius: 8, padding: "7px 14px", fontSize: 13, color: "var(--lh-slate)", cursor: "pointer" }}
                  >
                    Start next update
                  </button>
                </div>
              ) : scheduled ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--lh-teal)", fontSize: 13.5, fontWeight: 600 }}>
                    <Calendar size={15} /> Scheduled to send {formatDateTime(latestUpdate.scheduled_for)}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={handleApprove}
                      disabled={isPending}
                      className="lh-focus"
                      style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--lh-teal)", color: "white", border: "none", borderRadius: 8, padding: "8px 15px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    >
                      <Check size={14} /> Send now instead
                    </button>
                    <button
                      onClick={handleUnschedule}
                      disabled={isPending}
                      className="lh-focus"
                      style={{ background: "none", border: "1px solid var(--lh-line)", borderRadius: 8, padding: "8px 15px", fontSize: 13, color: "var(--lh-slate)", cursor: "pointer" }}
                    >
                      Cancel schedule
                    </button>
                  </div>
                </div>
              ) : held ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontSize: 13.5, color: "var(--lh-slate)" }}>Held — not sent this week.</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={handleResume}
                      disabled={isPending}
                      className="lh-focus"
                      style={{ background: "var(--lh-navy)", color: "white", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    >
                      Resume this draft
                    </button>
                    <button
                      onClick={handleStartNewUpdate}
                      disabled={isPending}
                      className="lh-focus"
                      style={{ background: "none", border: "1px solid var(--lh-line)", borderRadius: 8, padding: "7px 14px", fontSize: 13, color: "var(--lh-slate)", cursor: "pointer" }}
                    >
                      Start a fresh update instead
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={handleApprove}
                      disabled={isPending || !journey.client_user_id || !canSendMessages}
                      title={
                        !canSendMessages
                          ? "Sending messages is disabled while covering another agency"
                          : !journey.client_user_id
                          ? "Invite this client to their portal first"
                          : undefined
                      }
                      className="lh-focus"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: "var(--lh-teal)",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        padding: "8px 15px",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: !journey.client_user_id || !canSendMessages ? "default" : "pointer",
                        opacity: !journey.client_user_id || !canSendMessages ? 0.5 : 1,
                      }}
                    >
                      <Check size={14} /> Approve & Send
                    </button>
                    <button onClick={handleHold} disabled={isPending} className="lh-focus" style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "1px solid var(--lh-line)", borderRadius: 8, padding: "8px 15px", fontSize: 13, color: "var(--lh-slate)", cursor: "pointer" }}>
                      <X size={14} /> Hold this week
                    </button>
                    {!schedulingOpen && (
                      <button
                        onClick={() => setSchedulingOpen(true)}
                        disabled={isPending || !journey.client_user_id || !canSendMessages}
                        title={
                          !canSendMessages
                            ? "Sending messages is disabled while covering another agency"
                            : !journey.client_user_id
                            ? "Invite this client to their portal first"
                            : undefined
                        }
                        className="lh-focus"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          background: "none",
                          border: "1px solid var(--lh-line)",
                          borderRadius: 8,
                          padding: "8px 15px",
                          fontSize: 13,
                          color: "var(--lh-slate)",
                          cursor: !journey.client_user_id || !canSendMessages ? "default" : "pointer",
                          opacity: !journey.client_user_id || !canSendMessages ? 0.5 : 1,
                        }}
                      >
                        <Calendar size={14} /> Schedule for later
                      </button>
                    )}
                  </div>
                  {schedulingOpen && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4, maxWidth: 320 }}>
                      <input
                        type="datetime-local"
                        value={scheduleValue}
                        onChange={(e) => setScheduleValue(e.target.value)}
                        className="lh-focus"
                        style={{
                          border: "1px solid var(--lh-line)",
                          borderRadius: 8,
                          padding: "7px 10px",
                          fontSize: 13.5,
                          fontFamily: "inherit",
                          color: "var(--lh-navy)",
                        }}
                      />
                      {scheduleError && <div style={{ fontSize: 12.5, color: "var(--lh-red)" }}>{scheduleError}</div>}
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={handleSchedule}
                          disabled={isPending || !scheduleValue}
                          className="lh-focus"
                          style={{
                            background: "var(--lh-navy)",
                            color: "white",
                            border: "none",
                            borderRadius: 8,
                            padding: "7px 14px",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            opacity: !scheduleValue ? 0.6 : 1,
                          }}
                        >
                          Confirm schedule
                        </button>
                        <button
                          onClick={() => {
                            setSchedulingOpen(false);
                            setScheduleError("");
                          }}
                          disabled={isPending}
                          className="lh-focus"
                          style={{ background: "none", border: "1px solid var(--lh-line)", borderRadius: 8, padding: "7px 14px", fontSize: 13, color: "var(--lh-slate)", cursor: "pointer" }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  {!journey.client_user_id && (
                    <span style={{ fontSize: 11.5, color: "var(--lh-slate-light)" }}>
                      Invite this client to their portal before sending updates.
                    </span>
                  )}
                </div>
              )}
              {sendError && (
                <div style={{ marginTop: 10, fontSize: 13, color: "#B4472A" }}>{sendError}</div>
              )}
            </>
          )}
        </section>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 20 }}>
        {/* Captain's Log */}
        <section style={{ background: "var(--lh-paper)", border: "1px solid var(--lh-line)", borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 12px" }}>
            <h2 className="lh-display" style={{ fontSize: 15.5, fontWeight: 600, margin: 0 }}>
              Captain's Log
            </h2>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value)}
              className="lh-focus"
              title="How this list is ordered"
              style={{
                fontSize: 11.5,
                color: "var(--lh-navy-soft)",
                fontWeight: 500,
                border: "1px solid var(--lh-line)",
                borderRadius: 6,
                padding: "2px 4px",
                fontFamily: "inherit",
                background: "var(--lh-paper)",
              }}
            >
              <option value="manual">Sort: Manual</option>
              <option value="date">Sort: Due Date</option>
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {(() => {
              const displayedMilestones =
                sortMode === "date"
                  ? [...orderedMilestones].sort((a, b) => {
                      if (!a.due_date && !b.due_date) return 0;
                      if (!a.due_date) return 1;
                      if (!b.due_date) return -1;
                      return a.due_date.localeCompare(b.due_date);
                    })
                  : orderedMilestones;
              const nextId = displayedMilestones.find((m) => !m.done)?.id;
              return displayedMilestones.map((m) => {
                const expanded = expandedMilestoneId === m.id;
                const isNext = m.id === nextId;
                return (
                  <div
                    key={m.id}
                    draggable={sortMode === "manual"}
                    onDragStart={sortMode === "manual" ? (e) => handleMilestoneDragStart(e, m) : undefined}
                    onDragOver={sortMode === "manual" ? (e) => handleMilestoneDragOver(e, m) : undefined}
                    onDrop={sortMode === "manual" ? (e) => handleMilestoneDrop(e, m) : undefined}
                    onDragEnd={sortMode === "manual" ? handleMilestoneDragEnd : undefined}
                    style={{
                      background: isNext ? "var(--lh-teal-soft)" : "transparent",
                      borderRadius: 8,
                      marginLeft: isNext ? -8 : 0,
                      marginRight: isNext ? -8 : 0,
                      paddingLeft: isNext ? 8 : 0,
                      paddingRight: isNext ? 8 : 0,
                      opacity: draggedMilestoneId === m.id ? 0.4 : 1,
                      borderTop:
                        dragOverMilestoneId === m.id && draggedMilestoneId !== m.id
                          ? "2px solid var(--lh-teal)"
                          : "2px solid transparent",
                    }}
                  >
                    <div
                      onClick={() => toggleExpanded(m)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        rowGap: 6,
                        gap: 9,
                        padding: "6px 0",
                        cursor: "pointer",
                      }}
                    >
                      <button
                        onClick={(e) => handleToggleMilestone(e, m)}
                        disabled={isPending}
                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0 }}
                        title={m.done ? "Mark as not done" : "Mark as done"}
                      >
                        {m.done ? (
                          <CheckCircle2 size={16} color="var(--lh-teal)" strokeWidth={1.9} />
                        ) : (
                          <Circle
                            size={16}
                            color={isNext ? "var(--lh-teal)" : "var(--lh-slate-light)"}
                            strokeWidth={1.9}
                          />
                        )}
                      </button>
                      <span
                        style={{
                          fontSize: 13.5,
                          fontWeight: isNext ? 600 : 400,
                          color: m.done ? "var(--lh-navy)" : isNext ? "var(--lh-navy)" : "var(--lh-slate)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: "1 1 120px",
                          minWidth: 0,
                        }}
                      >
                        {m.label}
                      </span>
                      {isNext && (
                        <span
                          className="lh-mono"
                          style={{
                            fontSize: 9.5,
                            color: "var(--lh-teal)",
                            background: "var(--lh-paper)",
                            border: "1px solid #BFE0DC",
                            borderRadius: 20,
                            padding: "1px 7px",
                            flexShrink: 0,
                          }}
                        >
                          UP NEXT
                        </span>
                      )}
                      {!m.due_date && (
                        <span
                          className="lh-mono"
                          title="Milestones only appear to the client once you set a due date"
                          style={{
                            fontSize: 9.5,
                            color: "var(--lh-slate-light)",
                            border: "1px solid var(--lh-line)",
                            borderRadius: 20,
                            padding: "1px 7px",
                            flexShrink: 0,
                          }}
                        >
                          HIDDEN FROM CLIENT
                        </span>
                      )}
                      <ChevronDown
                        size={14}
                        color="var(--lh-slate-light)"
                        style={{
                          flexShrink: 0,
                          transition: "transform 150ms ease",
                          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                        }}
                      />
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}
                      >
                        <Calendar size={12} color="var(--lh-slate)" />
                        <input
                          type="date"
                          value={m.due_date || ""}
                          onChange={(e) => handleDueDateChange(e, m, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="lh-focus"
                          style={{
                            fontSize: 11.5,
                            color: "var(--lh-navy-soft)",
                            fontWeight: 500,
                            border: "1px solid var(--lh-line)",
                            borderRadius: 6,
                            padding: "2px 4px",
                            fontFamily: "inherit",
                            background: "var(--lh-paper)",
                            width: 118,
                          }}
                        />
                        <select
                          value={m.done ? "completed" : m.date_type || "estimated"}
                          onChange={(e) => handleMilestoneStatusChange(e, m, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="lh-focus"
                          title="What the client sees this date labeled as"
                          style={{
                            fontSize: 11.5,
                            color: "var(--lh-navy-soft)",
                            fontWeight: 500,
                            border: "1px solid var(--lh-line)",
                            borderRadius: 6,
                            padding: "2px 4px",
                            fontFamily: "inherit",
                            background: "var(--lh-paper)",
                          }}
                        >
                          <option value="estimated">Estimated</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                      <button
                        onClick={(e) => handleDeleteMilestone(e, m)}
                        disabled={isPending}
                        title="Delete milestone"
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          cursor: "pointer",
                          flexShrink: 0,
                          display: "flex",
                        }}
                      >
                        <Trash2 size={13} color="var(--lh-slate-light)" />
                      </button>
                      <div
                        onMouseDown={() => {
                          dragHandleActiveRef.current = true;
                        }}
                        onMouseUp={() => {
                          dragHandleActiveRef.current = false;
                        }}
                        onClick={(e) => e.stopPropagation()}
                        title={sortMode === "manual" ? "Drag to reorder" : undefined}
                        style={{
                          display: "flex",
                          flexShrink: 0,
                          width: 14,
                          cursor: sortMode === "manual" ? "grab" : "default",
                          touchAction: "none",
                          visibility: sortMode === "manual" ? "visible" : "hidden",
                        }}
                      >
                        <GripVertical size={14} color="var(--lh-slate-light)" />
                      </div>
                    </div>
                    {expanded && (
                      <div style={{ padding: "2px 0 10px 25px" }}>
                        <div
                          className="lh-mono"
                          style={{ fontSize: 10, fontWeight: 600, color: "var(--lh-slate-light)", letterSpacing: "0.04em", marginBottom: 4 }}
                        >
                          PRIVATE NOTE · ONLY YOU CAN SEE THIS
                        </div>
                        <textarea
                          value={noteDrafts[m.id] ?? m.notes ?? ""}
                          onChange={(e) =>
                            setNoteDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))
                          }
                          onBlur={() => handleSaveNotes(m)}
                          placeholder="Add a note about this milestone..."
                          className="lh-focus"
                          style={{
                            width: "100%",
                            minHeight: 60,
                            fontSize: 13,
                            fontFamily: "inherit",
                            color: "var(--lh-navy)",
                            border: "1px solid var(--lh-line)",
                            borderRadius: 8,
                            padding: 8,
                            resize: "vertical",
                          }}
                        />
                        <div
                          className="lh-mono"
                          style={{ fontSize: 10, fontWeight: 600, color: "var(--lh-teal)", letterSpacing: "0.04em", marginTop: 12, marginBottom: 4 }}
                        >
                          NOTE TO CLIENT · VISIBLE IN THEIR PORTAL
                        </div>
                        <textarea
                          value={clientNoteDrafts[m.id] ?? m.client_notes ?? ""}
                          onChange={(e) =>
                            setClientNoteDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))
                          }
                          onBlur={() => handleSaveClientNotes(m)}
                          placeholder="Add a comment your client will see on this milestone..."
                          className="lh-focus"
                          style={{
                            width: "100%",
                            minHeight: 60,
                            fontSize: 13,
                            fontFamily: "inherit",
                            color: "var(--lh-navy)",
                            border: "1px solid var(--lh-teal)",
                            borderRadius: 8,
                            padding: 8,
                            resize: "vertical",
                          }}
                        />
                        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                          {documents.filter((d) => d.milestone_id === m.id).length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                              {documents
                                .filter((d) => d.milestone_id === m.id)
                                .map((d) => (
                                  <DocumentThumbnail
                                    key={d.id}
                                    doc={d}
                                    onDelete={() => handleDeleteDocument(d.id)}
                                    deleting={deletingDocumentId === d.id}
                                  />
                                ))}
                            </div>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUploadClick(m.id);
                            }}
                            disabled={uploading}
                            className="lh-focus"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              alignSelf: "flex-start",
                              background: "none",
                              border: "1px solid var(--lh-line)",
                              borderRadius: 7,
                              padding: "4px 9px",
                              fontSize: 12,
                              color: "var(--lh-slate)",
                              cursor: "pointer",
                            }}
                          >
                            <Upload size={12} />
                            {uploading && uploadTargetMilestoneId === m.id ? "Uploading..." : "Attach a file"}
                          </button>
                          {uploadError && uploadErrorTargetId === m.id && (
                            <div style={{ fontSize: 12, color: "#B4472A" }}>{uploadError}</div>
                          )}

                          {m.video_url ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                              <video
                                controls
                                src={m.video_url}
                                style={{
                                  width: "100%",
                                  maxWidth: 260,
                                  borderRadius: 8,
                                  border: "1px solid var(--lh-line)",
                                  background: "#000",
                                }}
                              />
                              <span className="lh-mono" style={{ fontSize: 10.5, color: "var(--lh-slate-light)" }}>
                                {m.video_watched_at
                                  ? `Last watched ${formatDate(m.video_watched_at)}`
                                  : "Not watched yet"}
                              </span>
                              <button
                                onClick={(e) => handleRemoveVideo(e, m)}
                                disabled={isPending}
                                className="lh-focus"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                  background: "none",
                                  border: "none",
                                  padding: 0,
                                  fontSize: 11.5,
                                  color: "var(--lh-slate)",
                                  cursor: "pointer",
                                }}
                              >
                                <X size={11} /> Remove video
                              </button>
                            </div>
                          ) : videoPickerOpenId === m.id ? (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                border: "1px solid var(--lh-line)",
                                borderRadius: 8,
                                padding: 10,
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                                background: "var(--lh-fog)",
                                maxWidth: 280,
                              }}
                            >
                              {videoLibrary.length > 0 && (
                                <>
                                  <div style={{ display: "flex", gap: 6 }}>
                                    <select
                                      value={selectedExistingVideoId}
                                      onChange={(e) => setSelectedExistingVideoId(e.target.value)}
                                      className="lh-focus"
                                      style={{
                                        flex: 1,
                                        fontSize: 12,
                                        border: "1px solid var(--lh-line)",
                                        borderRadius: 6,
                                        padding: "4px 6px",
                                        fontFamily: "inherit",
                                        color: "var(--lh-slate)",
                                      }}
                                    >
                                      <option value="">Choose an existing video…</option>
                                      {videoLibrary.map((v) => (
                                        <option key={v.id} value={v.id}>
                                          {v.title}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      onClick={(e) => handleAttachExistingVideo(e, m.id)}
                                      disabled={!selectedExistingVideoId || isPending}
                                      className="lh-focus"
                                      style={{
                                        background: "var(--lh-navy)",
                                        color: "white",
                                        border: "none",
                                        borderRadius: 6,
                                        padding: "4px 10px",
                                        fontSize: 12,
                                        cursor: "pointer",
                                      }}
                                    >
                                      Use
                                    </button>
                                  </div>
                                  <div style={{ fontSize: 10.5, color: "var(--lh-slate-light)", textAlign: "center" }}>
                                    — or upload a new one —
                                  </div>
                                </>
                              )}
                              <input
                                type="text"
                                value={newVideoTitle}
                                onChange={(e) => setNewVideoTitle(e.target.value)}
                                placeholder="Video title (e.g. What is an appraisal?)"
                                className="lh-focus"
                                style={{
                                  border: "1px solid var(--lh-line)",
                                  borderRadius: 6,
                                  padding: "5px 8px",
                                  fontSize: 12,
                                  fontFamily: "inherit",
                                }}
                              />
                              <button
                                onClick={(e) => handleVideoUploadClick(e, m.id)}
                                disabled={uploadingVideo}
                                className="lh-focus"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 5,
                                  background: "none",
                                  border: "1px solid var(--lh-line)",
                                  borderRadius: 6,
                                  padding: "5px 9px",
                                  fontSize: 12,
                                  color: "var(--lh-slate)",
                                  cursor: "pointer",
                                }}
                              >
                                <Upload size={12} />
                                {uploadingVideo && videoUploadTargetMilestoneId === m.id
                                  ? "Uploading..."
                                  : "Choose video file"}
                              </button>
                              {videoError && videoErrorTargetId === m.id && (
                                <div style={{ fontSize: 11.5, color: "#B4472A" }}>{videoError}</div>
                              )}
                              <button
                                onClick={handleCancelVideoPicker}
                                style={{
                                  background: "none",
                                  border: "none",
                                  padding: 0,
                                  fontSize: 11.5,
                                  color: "var(--lh-slate-light)",
                                  cursor: "pointer",
                                  alignSelf: "flex-start",
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => handleOpenVideoPicker(e, m.id)}
                              className="lh-focus"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                                alignSelf: "flex-start",
                                background: "none",
                                border: "1px solid var(--lh-line)",
                                borderRadius: 7,
                                padding: "4px 9px",
                                fontSize: 12,
                                color: "var(--lh-slate)",
                                cursor: "pointer",
                              }}
                            >
                              <Video size={12} /> Add a video
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
            {milestones.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--lh-slate-light)" }}>No milestones yet.</div>
            )}
          </div>

          {addingMilestone ? (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              <input
                autoFocus
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddMilestone()}
                placeholder="Milestone name"
                className="lh-focus"
                style={{
                  border: "1px solid var(--lh-line)",
                  borderRadius: 8,
                  padding: "7px 10px",
                  fontSize: 13,
                  fontFamily: "inherit",
                }}
              />
              <div style={{ display: "flex", gap: 6 }}>
                <select
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value)}
                  className="lh-focus"
                  style={{
                    flex: 1,
                    border: "1px solid var(--lh-line)",
                    borderRadius: 8,
                    padding: "6px 8px",
                    fontSize: 12.5,
                    fontFamily: "inherit",
                    color: "var(--lh-slate)",
                  }}
                >
                  {journeyStages.filter((s) => s !== "Harbor").map((s) => (
                    <option key={s} value={s}>
                      {stageLabel(s)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddMilestone}
                  className="lh-focus"
                  style={{
                    background: "var(--lh-navy)",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    padding: "6px 14px",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setAddingMilestone(false);
                    setNewLabel("");
                  }}
                  className="lh-focus"
                  style={{
                    background: "none",
                    border: "1px solid var(--lh-line)",
                    borderRadius: 8,
                    padding: "6px 10px",
                    fontSize: 12.5,
                    color: "var(--lh-slate)",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingMilestone(true)}
              className="lh-focus"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "none",
                border: "none",
                color: "var(--lh-teal)",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
                marginTop: 10,
              }}
            >
              <Plus size={13} /> Add milestone
            </button>
          )}
        </section>

        {/* Documents */}
        <section style={{ background: "var(--lh-paper)", border: "1px solid var(--lh-line)", borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 className="lh-display" style={{ fontSize: 15.5, fontWeight: 600, margin: 0 }}>
              Documents
            </h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setRequestingDocument((cur) => !cur)}
                disabled={!journey.client_user_id || !canSendMessages}
                title={
                  !canSendMessages
                    ? "Sending messages is disabled while covering another agency"
                    : !journey.client_user_id
                    ? "Invite this client to their portal first"
                    : undefined
                }
                className="lh-focus"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  background: "none",
                  border: "1px solid var(--lh-line)",
                  borderRadius: 7,
                  padding: "5px 9px",
                  fontSize: 12,
                  color: "var(--lh-slate)",
                  cursor: journey.client_user_id ? "pointer" : "default",
                  opacity: journey.client_user_id ? 1 : 0.5,
                }}
              >
                <Bell size={12} /> Request
              </button>
              <button
                onClick={() => handleUploadClick(null)}
                disabled={uploading}
                className="lh-focus"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  background: "none",
                  border: "1px solid var(--lh-line)",
                  borderRadius: 7,
                  padding: "5px 9px",
                  fontSize: 12,
                  color: "var(--lh-slate)",
                  cursor: "pointer",
                }}
              >
                <Upload size={12} /> {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoFileChange}
              style={{ display: "none" }}
            />
          </div>

          {requestingDocument && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  autoFocus
                  value={newRequestLabel}
                  onChange={(e) => setNewRequestLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRequestDocument()}
                  placeholder="e.g. Proof of funds"
                  className="lh-focus"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    border: "1px solid var(--lh-line)",
                    borderRadius: 7,
                    padding: "6px 9px",
                    fontSize: 13,
                    fontFamily: "inherit",
                  }}
                />
                <button
                  onClick={handleRequestDocument}
                  disabled={requestingDocumentPending || !newRequestLabel.trim()}
                  className="lh-focus"
                  style={{
                    background: "var(--lh-navy)",
                    color: "white",
                    border: "none",
                    borderRadius: 7,
                    padding: "6px 12px",
                    fontSize: 12.5,
                    cursor: "pointer",
                    opacity: requestingDocumentPending || !newRequestLabel.trim() ? 0.6 : 1,
                  }}
                >
                  {requestingDocumentPending ? "Sending..." : "Send request"}
                </button>
                <button
                  onClick={() => {
                    setRequestingDocument(false);
                    setNewRequestLabel("");
                    setRequestError("");
                  }}
                  className="lh-focus"
                  style={{ background: "none", border: "1px solid var(--lh-line)", borderRadius: 7, padding: "6px 12px", fontSize: 12.5, color: "var(--lh-slate)", cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {requestError && (
            <div style={{ fontSize: 12.5, color: "var(--lh-red)", marginBottom: 12 }}>{requestError}</div>
          )}

          {documentRequests?.filter((r) => r.status === "pending").length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {documentRequests
                .filter((r) => r.status === "pending")
                .map((r) => (
                  <div
                    key={r.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      background: "var(--lh-fog)",
                      borderRadius: 9,
                      padding: "7px 11px",
                    }}
                  >
                    <span
                      className="lh-mono"
                      style={{
                        fontSize: 10,
                        color: "var(--lh-gold)",
                        background: "var(--lh-gold-soft)",
                        borderRadius: 20,
                        padding: "1px 7px",
                        flexShrink: 0,
                      }}
                    >
                      Requested
                    </span>
                    <span style={{ flex: 1, fontSize: 13, color: "var(--lh-navy-soft)" }}>{r.label}</span>
                    <span className="lh-mono" style={{ fontSize: 10.5, color: "var(--lh-slate-light)" }}>
                      {formatDate(r.requested_at)}
                    </span>
                    <button
                      onClick={() => handleCancelRequest(r.id)}
                      disabled={cancelingRequestId === r.id}
                      title="Cancel request"
                      className="lh-focus"
                      style={{ background: "none", border: "none", padding: 2, cursor: "pointer", display: "flex" }}
                    >
                      <X size={13} color="var(--lh-slate-light)" />
                    </button>
                  </div>
                ))}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {documents.map((d) => {
              const attachedMilestone = d.milestone_id
                ? milestones.find((m) => m.id === d.milestone_id)
                : null;
              return (
                <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <a
                    href={d.url || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lh-focus lh-doc-row"
                    style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5, color: "var(--lh-navy)", textDecoration: "none", flex: 1, minWidth: 0 }}
                  >
                    <FileText size={16} color="var(--lh-slate)" strokeWidth={1.75} style={{ flexShrink: 0 }} />
                    <span
                      className="lh-doc-name"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        textDecoration: "underline",
                      }}
                    >
                      {d.name}
                    </span>
                    {attachedMilestone && (
                      <span
                        className="lh-mono"
                        title={`Attached to the "${attachedMilestone.label}" milestone`}
                        style={{
                          fontSize: 10,
                          color: "var(--lh-teal)",
                          background: "var(--lh-teal-soft)",
                          borderRadius: 20,
                          padding: "1px 7px",
                          flexShrink: 0,
                        }}
                      >
                        {attachedMilestone.label}
                      </span>
                    )}
                    {d.uploaded_by === "client" && (
                      <span
                        className="lh-mono"
                        title="Uploaded by the client"
                        style={{
                          fontSize: 10,
                          color: "var(--lh-teal)",
                          background: "var(--lh-teal-soft)",
                          borderRadius: 20,
                          padding: "1px 7px",
                          flexShrink: 0,
                        }}
                      >
                        From client
                      </span>
                    )}
                    <span className="lh-mono" style={{ fontSize: 11, color: "var(--lh-slate-light)", flexShrink: 0 }}>
                      {formatDate(d.uploaded_at)}
                    </span>
                    <span
                      className="lh-mono"
                      style={{
                        fontSize: 10,
                        color: d.last_viewed_at ? "var(--lh-teal)" : "var(--lh-slate-light)",
                        flexShrink: 0,
                      }}
                    >
                      {d.last_viewed_at ? `Opened ${formatDate(d.last_viewed_at)}` : "Not opened"}
                    </span>
                  </a>
                  <button
                    onClick={() => handleDeleteDocument(d.id)}
                    disabled={deletingDocumentId === d.id}
                    title="Delete document"
                    className="lh-focus"
                    style={{
                      background: "none",
                      border: "none",
                      padding: 2,
                      cursor: deletingDocumentId === d.id ? "default" : "pointer",
                      display: "flex",
                      opacity: deletingDocumentId === d.id ? 0.5 : 1,
                    }}
                  >
                    <X size={14} color="var(--lh-slate-light)" />
                  </button>
                </div>
              );
            })}
            {documentError && (
              <div style={{ fontSize: 12.5, color: "var(--lh-red)" }}>{documentError}</div>
            )}
            {documents.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--lh-slate-light)" }}>No documents yet.</div>
            )}
          </div>
        </section>

        <section style={{ background: "var(--lh-paper)", border: "1px solid var(--lh-red-soft)", borderRadius: 14, padding: "18px 20px" }}>
          <h2 className="lh-display" style={{ fontSize: 15.5, fontWeight: 600, margin: "0 0 6px", color: "var(--lh-red)" }}>
            Danger Zone
          </h2>
          <p style={{ fontSize: 13, color: "var(--lh-slate)", margin: "0 0 12px" }}>
            Permanently deletes this Journey, its milestones, documents, photos, and update history — and
            revokes the client&apos;s portal login if they have one. This can&apos;t be undone.
          </p>

          {clientAccess?.hasLogin && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 16,
                paddingBottom: 16,
                borderBottom: "1px solid var(--lh-red-soft)",
              }}
            >
              <span style={{ fontSize: 13, color: "var(--lh-navy-soft)", flex: 1, minWidth: 160 }}>
                Client portal login:{" "}
                <strong style={{ color: clientAccess.revoked ? "var(--lh-red)" : "var(--lh-teal)" }}>
                  {clientAccess.revoked ? "Revoked" : "Active"}
                </strong>
              </span>

              {!confirmingRevokeAccess ? (
                <button
                  onClick={() =>
                    clientAccess.revoked
                      ? handleToggleClientAccess(false)
                      : setConfirmingRevokeAccess(true)
                  }
                  disabled={updatingClientAccess}
                  className="lh-focus"
                  style={{
                    background: "none",
                    border: `1px solid ${clientAccess.revoked ? "var(--lh-teal)" : "var(--lh-red)"}`,
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: 12.5,
                    color: clientAccess.revoked ? "var(--lh-teal)" : "var(--lh-red)",
                    cursor: updatingClientAccess ? "default" : "pointer",
                    opacity: updatingClientAccess ? 0.6 : 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  {updatingClientAccess
                    ? "Working..."
                    : clientAccess.revoked
                    ? "Restore access"
                    : "Revoke access"}
                </button>
              ) : (
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{ fontSize: 12.5, color: "var(--lh-navy-soft)", alignSelf: "center" }}>
                    Block this client&apos;s login?
                  </span>
                  <button
                    onClick={() => handleToggleClientAccess(true)}
                    disabled={updatingClientAccess}
                    className="lh-focus"
                    style={{
                      background: "var(--lh-red)",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      padding: "6px 12px",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: updatingClientAccess ? "default" : "pointer",
                      opacity: updatingClientAccess ? 0.6 : 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmingRevokeAccess(false)}
                    disabled={updatingClientAccess}
                    className="lh-focus"
                    style={{
                      background: "none",
                      border: "1px solid var(--lh-line)",
                      borderRadius: 8,
                      padding: "6px 12px",
                      fontSize: 12.5,
                      color: "var(--lh-slate)",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
          {clientAccessError && (
            <div style={{ fontSize: 12.5, color: "var(--lh-red)", marginBottom: 12 }}>{clientAccessError}</div>
          )}

          {!confirmingDelete ? (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="lh-focus"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "none",
                border: "1px solid var(--lh-red)",
                borderRadius: 8,
                padding: "7px 14px",
                fontSize: 13,
                color: "var(--lh-red)",
                cursor: "pointer",
              }}
            >
              <Trash2 size={13} /> Delete this Journey
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 380 }}>
              <label style={{ fontSize: 12.5, color: "var(--lh-navy-soft)" }}>
                Type <strong>{journey.client_name}</strong> to confirm.
              </label>
              <input
                autoFocus
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="lh-focus"
                style={{
                  border: "1px solid var(--lh-line)",
                  borderRadius: 8,
                  padding: "7px 10px",
                  fontSize: 13.5,
                  fontFamily: "inherit",
                }}
              />
              {deleteJourneyError && (
                <div style={{ fontSize: 12.5, color: "var(--lh-red)" }}>{deleteJourneyError}</div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleDeleteJourney}
                  disabled={
                    deletingJourney || deleteConfirmText.trim().toLowerCase() !== journey.client_name.trim().toLowerCase()
                  }
                  className="lh-focus"
                  style={{
                    background: "var(--lh-red)",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    padding: "7px 14px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor:
                      deletingJourney || deleteConfirmText.trim().toLowerCase() !== journey.client_name.trim().toLowerCase()
                        ? "default"
                        : "pointer",
                    opacity:
                      deletingJourney || deleteConfirmText.trim().toLowerCase() !== journey.client_name.trim().toLowerCase()
                        ? 0.5
                        : 1,
                  }}
                >
                  {deletingJourney ? "Deleting..." : "Permanently delete"}
                </button>
                <button
                  onClick={() => {
                    setConfirmingDelete(false);
                    setDeleteConfirmText("");
                    setDeleteJourneyError("");
                  }}
                  disabled={deletingJourney}
                  className="lh-focus"
                  style={{
                    background: "none",
                    border: "1px solid var(--lh-line)",
                    borderRadius: 8,
                    padding: "7px 14px",
                    fontSize: 13,
                    color: "var(--lh-slate)",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
