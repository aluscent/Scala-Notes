import React, { useEffect, useMemo, useState } from "react";
import {
  AppBar,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Toolbar,
  Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import LabelIcon from "@mui/icons-material/Label";
import FolderIcon from "@mui/icons-material/Folder";
import RefreshIcon from "@mui/icons-material/Refresh";

import { api, Category, Note, NoteUpsert, Tag } from "./api";

const drawerWidth = 320;

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
        <ListItemText primary={props.name} />
      )}
    </ListItem>
  );
}

export default function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);

  const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null);
  const [filterTagId, setFilterTagId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);
  const [manageTagsOpen, setManageTagsOpen] = useState(false);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) ?? null,
    [notes, selectedNoteId]
  );

  async function reloadAll() {
    const [cats, tgs] = await Promise.all([api.listCategories(), api.listTags()]);
    setCategories(cats);
    setTags(tgs);
    await reloadNotes({ categories: cats, tags: tgs });
  }

  async function reloadNotes(_?: { categories?: Category[]; tags?: Tag[] }) {
    const list = await api.listNotes({
      q: search.trim() ? search.trim() : undefined,
      categoryId: filterCategoryId ?? undefined,
      tagId: filterTagId ?? undefined
    });
    setNotes(list);
    if (selectedNoteId && !list.some((n) => n.id === selectedNoteId)) {
      setSelectedNoteId(list[0]?.id ?? null);
    }
  }

  useEffect(() => {
    void reloadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void reloadNotes();
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategoryId, filterTagId, search]);

  async function createEmptyNote() {
    const created = await api.createNote({
      title: "Untitled",
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

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <AppBar position="fixed" elevation={0} sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Scala Notes
          </Typography>

          <TextField
            size="small"
            placeholder="Search by title"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 320, bgcolor: "background.paper", borderRadius: 2, mr: 1 }}
          />

          <IconButton color="inherit" onClick={() => reloadAll()} aria-label="refresh">
            <RefreshIcon />
          </IconButton>

          <Button color="inherit" startIcon={<AddIcon />} onClick={() => createEmptyNote()}>
            New note
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: "border-box" }
        }}
      >
        <Toolbar />
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
            <FolderIcon fontSize="small" /> Categories
          </Typography>

          <List dense>
            <ListItem disablePadding>
              <ListItemButton selected={filterCategoryId === null} onClick={() => setFilterCategoryId(null)}>
                <ListItemText primary="All categories" />
              </ListItemButton>
            </ListItem>
            {categories.map((c) => (
              <ListItem key={c.id} disablePadding>
                <ListItemButton selected={filterCategoryId === c.id} onClick={() => setFilterCategoryId(c.id)}>
                  <ListItemText primary={c.name} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          <Button
            fullWidth
            variant="outlined"
            sx={{ mt: 1 }}
            onClick={() => setManageCategoriesOpen(true)}
          >
            Manage categories
          </Button>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
            <LabelIcon fontSize="small" /> Tags
          </Typography>

          <List dense>
            <ListItem disablePadding>
              <ListItemButton selected={filterTagId === null} onClick={() => setFilterTagId(null)}>
                <ListItemText primary="All tags" />
              </ListItemButton>
            </ListItem>
            {tags.map((t) => (
              <ListItem key={t.id} disablePadding>
                <ListItemButton selected={filterTagId === t.id} onClick={() => setFilterTagId(t.id)}>
                  <ListItemText primary={t.name} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          <Button fullWidth variant="outlined" sx={{ mt: 1 }} onClick={() => setManageTagsOpen(true)}>
            Manage tags
          </Button>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 2, mt: 8 }}>
        <Stack direction={{ xs: "column", lg: "row" }} spacing={2} sx={{ height: "calc(100vh - 96px)" }}>
          <Box
            sx={{
              width: { xs: "100%", lg: 420 },
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 3,
              overflow: "hidden"
            }}
          >
            <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="subtitle1">Notes</Typography>
              <Typography variant="body2" color="text.secondary">
                {notes.length}
              </Typography>
            </Box>
            <Divider />
            <List dense sx={{ maxHeight: { xs: 320, lg: "100%" }, overflow: "auto" }}>
              {notes.map((n) => (
                <ListItem key={n.id} disablePadding>
                  <ListItemButton selected={selectedNoteId === n.id} onClick={() => setSelectedNoteId(n.id)}>
                    <ListItemText
                      primary={n.title || "Untitled"}
                      secondary={new Date(n.updatedAt).toLocaleString()}
                      primaryTypographyProps={{ noWrap: true }}
                      secondaryTypographyProps={{ noWrap: true }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>

          <Box sx={{ flexGrow: 1, border: "1px solid", borderColor: "divider", borderRadius: 3, p: 2 }}>
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
                <Typography color="text.secondary">Select a note or create a new one.</Typography>
              </Box>
            )}
          </Box>
        </Stack>
      </Box>

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
        title: title.trim() || "Untitled",
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
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          fullWidth
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={busy || !dirty}
          onClick={save}
        >
          Save
        </Button>
        <IconButton color="error" disabled={busy} onClick={props.onDelete} aria-label="delete-note">
          <DeleteIcon />
        </IconButton>
      </Stack>

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

      <TextField
        label="Content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        multiline
        minRows={10}
        fullWidth
        sx={{ flexGrow: 1 }}
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
