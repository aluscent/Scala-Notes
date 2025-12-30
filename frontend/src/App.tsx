import React, { useEffect, useMemo, useState } from "react";
import {
  AppBar,
  Autocomplete,
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  LinearProgress,
  List,
  ListItem,
  Paper,
  Stack,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  Tabs,
  Tab,
  Alert
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import LabelIcon from "@mui/icons-material/Label";
import FolderIcon from "@mui/icons-material/Folder";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import NoteAltIcon from "@mui/icons-material/NoteAlt";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

import { api, Category, Note, NoteUpsert, Tag } from "./api";

const glassPaper = {
  backdropFilter: "blur(14px)",
  background: "rgba(255,255,255,0.82)",
  border: "1px solid",
  borderColor: "divider"
};

type EntityKind = "category" | "tag";

function EntityManagerDialog(props: {
  open: boolean;
  kind: EntityKind;
  entities: Array<Category | Tag>;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
  onUpdate: (id: number, name: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const title = props.kind === "category" ? "Categories" : "Tags";
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (props.open) setName("");
  }, [props.open]);

  async function safe<T>(fn: () => Promise<T>) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={props.open} onClose={props.onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <TextField
            fullWidth
            label={`New ${props.kind}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            disabled={busy || !name.trim()}
            onClick={() =>
              safe(async () => {
                await props.onCreate(name.trim());
                setName("");
              })
            }
          >
            Add
          </Button>
        </Stack>

        <List dense sx={{ mt: 2 }}>
          {props.entities.map((e) => (
            <EntityRow
              key={e.id}
              id={e.id}
              name={e.name}
              busy={busy}
              onUpdate={(n) => safe(() => props.onUpdate(e.id, n))}
              onDelete={() => safe(() => props.onDelete(e.id))}
            />
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function EntityRow(props: {
  id: number;
  name: string;
  busy: boolean;
  onUpdate: (name: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(props.name);

  useEffect(() => setValue(props.name), [props.name]);

  return (
    <ListItem
      secondaryAction={
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            disabled={props.busy}
            onClick={() => {
              if (!editing) {
                setEditing(true);
              } else {
                setEditing(false);
                props.onUpdate(value.trim());
              }
            }}
          >
            {editing ? "Save" : "Edit"}
          </Button>
          <IconButton size="small" disabled={props.busy} onClick={props.onDelete} aria-label="delete">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      }
    >
      {editing ? (
        <TextField
          size="small"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          sx={{ width: "100%" }}
        />
      ) : (
        <Typography>{props.name}</Typography>
      )}
    </ListItem>
  );
}

function NotePreviewCard(props: {
  note: Note;
  selected: boolean;
  onSelect: () => void;
}) {
  const snippet = props.note.content?.trim()?.replace(/\n+/g, " ") || "No content yet";

  return (
    <Paper
      onClick={props.onSelect}
      variant="outlined"
      sx={{
        p: 2,
        cursor: "pointer",
        borderColor: props.selected ? "primary.main" : "divider",
        boxShadow: props.selected ? 6 : 1,
        transition: "transform 120ms ease, box-shadow 120ms ease",
        transform: props.selected ? "translateY(-2px)" : "none",
        bgcolor: props.selected ? "primary.light" : "background.paper",
        "&:hover": { boxShadow: 4, transform: "translateY(-2px)" }
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <NoteAltIcon color={props.selected ? "inherit" : "primary"} />
          <Typography variant="subtitle1" noWrap>
            {props.note.title || "Untitled"}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="Last updated">
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <CalendarTodayIcon fontSize="inherit" sx={{ color: "text.secondary" }} />
              <Typography variant="caption" color="text.secondary">
                {new Date(props.note.updatedAt).toLocaleDateString()}
              </Typography>
            </Stack>
          </Tooltip>
        </Stack>

        <Typography variant="body2" color="text.secondary" noWrap>
          {snippet || "No content yet."}
        </Typography>

        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {props.note.categories.map((c) => (
            <Chip
              key={`cat-${c.id}`}
              size="small"
              icon={<FolderIcon fontSize="small" />}
              label={c.name}
              color="primary"
              variant="outlined"
            />
          ))}
          {props.note.tags.map((t) => (
            <Chip key={`tag-${t.id}`} size="small" icon={<LabelIcon fontSize="small" />} label={t.name} />
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}

function FilterPanel(props: {
  categories: Category[];
  tags: Tag[];
  filterCategoryId: number | null;
  filterTagId: number | null;
  search: string;
  onSearchChange: (v: string) => void;
  onCategoryChange: (id: number | null) => void;
  onTagChange: (id: number | null) => void;
  onManageCategories: () => void;
  onManageTags: () => void;
  onClearFilters: () => void;
}) {
  const filtersActive = Boolean(props.search.trim() || props.filterCategoryId || props.filterTagId);

  return (
    <Paper sx={{ p: 2.5, ...glassPaper }} elevation={0}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <Avatar sx={{ bgcolor: "primary.main" }}>
          <FilterAltIcon />
        </Avatar>
        <Box>
          <Typography variant="subtitle1">Filters</Typography>
          <Typography variant="body2" color="text.secondary">
            Narrow down notes with smart filters.
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title="Clear search and filters">
          <span>
            <IconButton onClick={props.onClearFilters} disabled={!filtersActive} aria-label="clear filters">
              <ClearAllIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      <TextField
        fullWidth
        placeholder="Search by title or content"
        value={props.search}
        onChange={(e) => props.onSearchChange(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
        sx={{ mb: 2 }}
      />

      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
        Categories
      </Typography>
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <Chip
          label="All"
          variant={props.filterCategoryId === null ? "filled" : "outlined"}
          color="primary"
          onClick={() => props.onCategoryChange(null)}
          icon={<FolderIcon fontSize="small" />}
        />
        {props.categories.map((c) => (
          <Chip
            key={c.id}
            label={c.name}
            onClick={() => props.onCategoryChange(c.id)}
            color={props.filterCategoryId === c.id ? "primary" : "default"}
            variant={props.filterCategoryId === c.id ? "filled" : "outlined"}
            icon={<FolderIcon fontSize="small" />}
          />
        ))}
        <Button size="small" onClick={props.onManageCategories} startIcon={<AddIcon />}>Manage</Button>
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
        Tags
      </Typography>
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
        <Chip
          label="All"
          variant={props.filterTagId === null ? "filled" : "outlined"}
          color="secondary"
          onClick={() => props.onTagChange(null)}
          icon={<LabelIcon fontSize="small" />}
        />
        {props.tags.map((t) => (
          <Chip
            key={t.id}
            label={t.name}
            onClick={() => props.onTagChange(t.id)}
            color={props.filterTagId === t.id ? "secondary" : "default"}
            variant={props.filterTagId === t.id ? "filled" : "outlined"}
            icon={<LabelIcon fontSize="small" />}
          />
        ))}
        <Button size="small" onClick={props.onManageTags} startIcon={<AddIcon />}>Manage</Button>
      </Stack>
    </Paper>
  );
}

export default function App() {
  const [user, setUser] = useState<{ id: number; email: string } | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);

  const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null);
  const [filterTagId, setFilterTagId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);
  const [manageTagsOpen, setManageTagsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newNoteDialogOpen, setNewNoteDialogOpen] = useState(false);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) ?? null,
    [notes, selectedNoteId]
  );

  async function reloadAll() {
    if (!user) return;
    setLoading(true);
    try {
      const [cats, tgs] = await Promise.all([api.listCategories(), api.listTags()]);
      setCategories(cats);
      setTags(tgs);
      await reloadNotes({ categories: cats, tags: tgs, silent: true });
    } finally {
      setLoading(false);
    }
  }

  async function reloadNotes(_?: { categories?: Category[]; tags?: Tag[]; silent?: boolean }) {
    if (!user) return;
    if (!_?.silent) setLoading(true);
    try {
      const list = await api.listNotes({
        q: search.trim() ? search.trim() : undefined,
        categoryId: filterCategoryId ?? undefined,
        tagId: filterTagId ?? undefined
      });
      setNotes(list);
      if (selectedNoteId && !list.some((n) => n.id === selectedNoteId)) {
        setSelectedNoteId(list[0]?.id ?? null);
      }
    } finally {
      if (!_?.silent) setLoading(false);
    }
  }

  useEffect(() => {
    void bootstrapAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) {
      void reloadAll();
    } else {
      setNotes([]);
      setCategories([]);
      setTags([]);
      setSelectedNoteId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => {
      void reloadNotes();
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategoryId, filterTagId, search, user]);

  async function createNoteWithTitle(title: string) {
    const created = await api.createNote({
      title: title.trim(),
      content: "",
      categoryIds: [],
      tagIds: []
    });
    setNotes((prev) => [created, ...prev]);
    setSelectedNoteId(created.id);
  }

  async function deleteSelectedNote() {
    if (!selectedNote) return;
    await api.deleteNote(selectedNote.id);
    const remaining = notes.filter((n) => n.id !== selectedNote.id);
    setNotes(remaining);
    setSelectedNoteId(remaining[0]?.id ?? null);
  }

  async function saveNote(upsert: NoteUpsert) {
    if (!selectedNote) return;
    const updated = await api.updateNote(selectedNote.id, upsert);
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
  }

  async function bootstrapAuth() {
    try {
      await api.csrf();
      const me = await api.me();
      setUser(me.user);
      setAuthDialogOpen(false);
    } catch {
      setAuthDialogOpen(true);
    }
  }

  async function handleAuth(email: string, password: string, mode: "login" | "signup") {
    await api.csrf();
    const res = mode === "login" ? await api.login(email, password) : await api.signup(email, password);
    setUser(res.user);
    setAuthDialogOpen(false);
    await reloadAll();
  }

  async function handleLogout() {
    await api.logout();
    setUser(null);
    setAuthDialogOpen(true);
  }

  const activeFiltersCount = [filterCategoryId, filterTagId].filter(Boolean).length + (search.trim() ? 1 : 0);

  function handleBackgroundClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      setSelectedNoteId(null);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "radial-gradient(circle at 20% 20%, #f8f1ff 0, #e6eaff 25%, #f6f8ff 50%, #ffffff 100%)",
        pb: 6
      }}
    >
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: "rgba(15, 23, 42, 0.72)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid",
          borderColor: "rgba(255,255,255,0.1)"
        }}
      >
        <Toolbar>
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar sx={{ bgcolor: "secondary.main" }}>
              <AutoAwesomeIcon />
            </Avatar>
            <Box>
              <Typography variant="h6">Scala Notes</Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)" }}>
                Capture, organize, and revisit ideas beautifully.
              </Typography>
            </Box>
          </Stack>
          <Box sx={{ flexGrow: 1 }} />
          <Badge color="secondary" badgeContent={activeFiltersCount || 0} invisible={!activeFiltersCount} sx={{ mr: 2 }}>
            <Tooltip title="Reload everything">
              <IconButton color="inherit" onClick={() => reloadAll()} aria-label="refresh" disabled={!user}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Badge>
          {user ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                color="secondary"
                label={user.email}
                avatar={<Avatar>{user.email.charAt(0).toUpperCase()}</Avatar>}
                sx={{ bgcolor: "rgba(255,255,255,0.12)" }}
              />
              <Button color="inherit" onClick={handleLogout}>
                Log out
              </Button>
              <Button color="inherit" startIcon={<AddIcon />} onClick={() => setNewNoteDialogOpen(true)} variant="outlined">
                New note
              </Button>
            </Stack>
          ) : (
            <Button color="inherit" variant="outlined" onClick={() => setAuthDialogOpen(true)}>
              Sign in / Sign up
            </Button>
          )}
        </Toolbar>
        {loading ? <LinearProgress color="secondary" /> : null}
      </AppBar>

      {!user ? (
        <Container maxWidth="md" sx={{ py: 10 }}>
          <Paper elevation={0} sx={{ p: 4, borderRadius: 4, ...glassPaper }}>
            <Stack spacing={2} alignItems="flex-start">
              <Typography variant="h4" fontWeight={700}>
                Welcome back! Please sign in to view your notes.
              </Typography>
              <Typography color="text.secondary">
                Your notes are secured per account. Log in or create an account to access your personal categories, tags, and notes.
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button variant="contained" onClick={() => { setAuthMode("login"); setAuthDialogOpen(true); }}>
                  Sign in
                </Button>
                <Button variant="outlined" onClick={() => { setAuthMode("signup"); setAuthDialogOpen(true); }}>
                  Create account
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Container>
      ) : (
        <Container maxWidth="xl" sx={{ py: 4 }} onClick={handleBackgroundClick}>
          <Stack spacing={3}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 4,
                ...glassPaper,
                background: "linear-gradient(135deg, #f8f1ff, #e0f2fe)",
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" },
                gap: 3,
                alignItems: "center"
              }}
            >
              <Stack spacing={1}>
                <Typography variant="h4" fontWeight={700} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  Your ideas deserve a beautiful home.
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Explore notes with refined filters, manage categories & tags inline, and edit with confidence in a polished workspace.
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Chip color="primary" label={`${notes.length} notes`} icon={<NoteAltIcon />} />
                  <Chip color="secondary" label={`${categories.length} categories`} icon={<FolderIcon />} />
                  <Chip color="default" label={`${tags.length} tags`} icon={<LabelIcon />} />
                </Stack>
              </Stack>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, ...glassPaper }}>
                <Stack spacing={1.5}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Avatar sx={{ bgcolor: "primary.main" }}>
                      <NoteAltIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1">Quick actions</Typography>
                      <Typography variant="body2" color="text.secondary">Jump back into work instantly.</Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <Button fullWidth variant="contained" startIcon={<AddIcon />} onClick={() => setNewNoteDialogOpen(true)}>
                      New note
                    </Button>
                    <Button fullWidth variant="outlined" onClick={() => reloadAll()} startIcon={<RefreshIcon />}>
                      Refresh
                    </Button>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Use the filters to quickly discover notes by category, tag, or keyword.
                  </Typography>
                </Stack>
              </Paper>
            </Paper>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "360px 1fr" },
                gap: 3,
                alignItems: "stretch"
              }}
            >
              <Stack spacing={2.5}>
                <FilterPanel
                  categories={categories}
                  tags={tags}
                  filterCategoryId={filterCategoryId}
                  filterTagId={filterTagId}
                  search={search}
                  onSearchChange={setSearch}
                  onCategoryChange={setFilterCategoryId}
                  onTagChange={setFilterTagId}
                  onManageCategories={() => setManageCategoriesOpen(true)}
                  onManageTags={() => setManageTagsOpen(true)}
                  onClearFilters={() => {
                    setSearch("");
                    setFilterCategoryId(null);
                    setFilterTagId(null);
                  }}
                />

                <Paper sx={{ p: 2.5, ...glassPaper, maxHeight: "calc(100vh - 360px)", overflow: "auto" }} elevation={0} onClick={handleBackgroundClick}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <Avatar sx={{ bgcolor: "primary.main" }}>
                      <NoteAltIcon />
                    </Avatar>
                    <Typography variant="subtitle1">Notes</Typography>
                    <Chip label={notes.length} size="small" />
                    <Box sx={{ flexGrow: 1 }} />
                    <Tooltip title="Create a new blank note">
                      <IconButton color="primary" onClick={() => setNewNoteDialogOpen(true)} aria-label="create note">
                        <AddIcon />
                      </IconButton>
                    </Tooltip>
                  </Stack>

                  <Stack spacing={1.5}>
                    {notes.length === 0 ? (
                      <Box sx={{ py: 4, textAlign: "center" }}>
                        <Typography variant="body2" color="text.secondary">
                          No notes match your filters. Create one to get started!
                        </Typography>
                      </Box>
                    ) : (
                      notes.map((n) => (
                        <NotePreviewCard key={n.id} note={n} selected={selectedNoteId === n.id} onSelect={() => setSelectedNoteId(n.id)} />
                      ))
                    )}
                  </Stack>
                </Paper>
              </Stack>

              <Paper sx={{ p: 3, height: { xs: "auto", md: "calc(100vh - 230px)" }, ...glassPaper }} elevation={0}>
                {selectedNote ? (
                  <NoteEditor
                    key={selectedNote.id}
                    note={selectedNote}
                    categories={categories}
                    tags={tags}
                    onSave={saveNote}
                    onDelete={deleteSelectedNote}
                  />
                ) : (
                  <Box sx={{ height: "100%", display: "grid", placeItems: "center" }}>
                    <Stack spacing={1} textAlign="center">
                      <Typography variant="h6">Select or create a note</Typography>
                      <Typography color="text.secondary">
                        Choose a note from the left or start a brand-new one to see it here.
                      </Typography>
                      <Button variant="contained" startIcon={<AddIcon />} onClick={() => setNewNoteDialogOpen(true)}>
                        Create note
                      </Button>
                    </Stack>
                  </Box>
                )}
              </Paper>
            </Box>
          </Stack>
        </Container>
      )}

      <EntityManagerDialog
        open={manageCategoriesOpen}
        kind="category"
        entities={categories}
        onClose={() => setManageCategoriesOpen(false)}
        onCreate={async (name) => {
          await api.createCategory(name);
          setCategories(await api.listCategories());
        }}
        onUpdate={async (id, name) => {
          await api.updateCategory(id, name);
          setCategories(await api.listCategories());
          await reloadNotes();
        }}
        onDelete={async (id) => {
          await api.deleteCategory(id);
          setCategories(await api.listCategories());
          await reloadNotes();
        }}
      />

      <EntityManagerDialog
        open={manageTagsOpen}
        kind="tag"
        entities={tags}
        onClose={() => setManageTagsOpen(false)}
        onCreate={async (name) => {
          await api.createTag(name);
          setTags(await api.listTags());
        }}
        onUpdate={async (id, name) => {
          await api.updateTag(id, name);
          setTags(await api.listTags());
          await reloadNotes();
        }}
        onDelete={async (id) => {
          await api.deleteTag(id);
          setTags(await api.listTags());
          await reloadNotes();
        }}
      />

      <NewNoteDialog
        open={newNoteDialogOpen}
        onClose={() => setNewNoteDialogOpen(false)}
        onCreate={async (title) => {
          await createNoteWithTitle(title);
          setNewNoteDialogOpen(false);
        }}
      />

      <AuthDialog
        open={authDialogOpen}
        mode={authMode}
        onModeChange={setAuthMode}
        onClose={() => setAuthDialogOpen(false)}
        onSubmit={handleAuth}
      />
    </Box>
  );
}

function NoteEditor(props: {
  note: Note;
  categories: Category[];
  tags: Tag[];
  onSave: (u: NoteUpsert) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [title, setTitle] = useState(props.note.title);
  const [content, setContent] = useState(props.note.content);
  const [cats, setCats] = useState<Category[]>(props.note.categories);
  const [tgs, setTgs] = useState<Tag[]>(props.note.tags);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    title !== props.note.title ||
    content !== props.note.content ||
    JSON.stringify(cats.map((c) => c.id).sort()) !== JSON.stringify(props.note.categories.map((c) => c.id).sort()) ||
    JSON.stringify(tgs.map((t) => t.id).sort()) !== JSON.stringify(props.note.tags.map((t) => t.id).sort());

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await props.onSave({
        title: title.trim(),
        content,
        categoryIds: cats.map((c) => c.id),
        tagIds: tgs.map((t) => t.id)
      });
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack spacing={2} sx={{ height: "100%" }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="flex-start">
        <TextField
          fullWidth
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={!title.trim()}
          helperText={!title.trim() ? "Title is required" : undefined}
          InputProps={{
            startAdornment: <InputAdornment position="start"><NoteAltIcon color="primary" /></InputAdornment>
          }}
        />
        <Stack direction="row" spacing={1} alignItems="center">
          {dirty ? <Chip color="secondary" label="Unsaved changes" /> : <Chip label="Saved" color="success" />}
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={busy || !dirty || !title.trim()}
            onClick={save}
          >
            Save
          </Button>
          <Tooltip title="Delete this note">
            <span>
              <IconButton color="error" disabled={busy} onClick={props.onDelete} aria-label="delete-note">
                <DeleteIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <Autocomplete
            multiple
            options={props.categories}
            value={cats}
            onChange={(_, v) => setCats(v)}
            getOptionLabel={(o) => o.name}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={(params) => <TextField {...params} label="Categories" />}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip label={option.name} {...getTagProps({ index })} key={option.id} />
              ))
            }
            sx={{ flex: 1 }}
          />

          <Autocomplete
            multiple
            options={props.tags}
            value={tgs}
            onChange={(_, v) => setTgs(v)}
            getOptionLabel={(o) => o.name}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={(params) => <TextField {...params} label="Tags" />}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip label={option.name} {...getTagProps({ index })} key={option.id} />
              ))
            }
            sx={{ flex: 1 }}
          />
        </Stack>
      </Paper>

      <TextField
        label="Content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        multiline
        minRows={12}
        fullWidth
        sx={{ flexGrow: 1 }}
        placeholder="Write your thoughts, tasks, and ideas here..."
      />

      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: "auto" }}>
        <Typography variant="caption" color="text.secondary">
          Created: {new Date(props.note.createdAt).toLocaleString()} • Updated: {new Date(props.note.updatedAt).toLocaleString()}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {error ? (
          <Typography variant="caption" color="error" sx={{ maxWidth: 600 }} noWrap title={error}>
            {error}
          </Typography>
        ) : null}
      </Stack>
    </Stack>
  );
}

function NewNoteDialog(props: {
  open: boolean;
  onClose: () => void;
  onCreate: (title: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (props.open) {
      setTitle("");
      setError(null);
    }
  }, [props.open]);

  async function submit() {
    if (!title.trim()) {
      setError("Please enter a title before creating a note.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await props.onCreate(title.trim());
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={props.open} onClose={props.onClose} fullWidth maxWidth="xs">
      <DialogTitle>Create a note</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Meeting notes"
          margin="dense"
        />
        {error ? (
          <Typography variant="caption" color="error">
            {error}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={submit} variant="contained" disabled={busy || !title.trim()} startIcon={<AddIcon />}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function AuthDialog(props: {
  open: boolean;
  mode: "login" | "signup";
  onModeChange: (mode: "login" | "signup") => void;
  onClose: () => void;
  onSubmit: (email: string, password: string, mode: "login" | "signup") => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (props.open) {
      setEmail("");
      setPassword("");
      setError(null);
    }
  }, [props.open, props.mode]);

  async function submit() {
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await props.onSubmit(email.trim(), password, props.mode);
    } catch (e: any) {
      setError(e?.message ?? "Unable to sign in right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={props.open} onClose={props.onClose} fullWidth maxWidth="xs">
      <DialogTitle>{props.mode === "login" ? "Sign in" : "Create your account"}</DialogTitle>
      <DialogContent>
        <Tabs
          value={props.mode}
          onChange={(_, v) => props.onModeChange(v)}
          variant="fullWidth"
          sx={{ mb: 2 }}
        >
          <Tab label="Sign in" value="login" />
          <Tab label="Sign up" value="signup" />
        </Tabs>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            autoFocus
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            helperText={props.mode === "signup" ? "At least 8 characters." : undefined}
          />
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={submit} variant="contained" disabled={busy}>
          {props.mode === "login" ? "Sign in" : "Sign up"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
