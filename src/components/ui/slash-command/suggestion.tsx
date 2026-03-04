import { ReactRenderer } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import CommandsList, { type CommandsListHandle, type SlashItem } from "./commands-list";
import { Code, Heading1, Heading2, Heading3, Image, List, ListOrdered, Pilcrow, Quote, Table } from "lucide-react";

export type ImagePickerResult = {
  src: string;
  alt?: string | null;
  title?: string | null;
};

export type ImagePickerContext = {
  editor: Editor;
  range: { from: number; to: number };
};

export type ImagePickerHandler = (
  context: ImagePickerContext,
) => ImagePickerResult | null | Promise<ImagePickerResult | null>;

export type SlashImageFallback = "prompt-url" | "none";

type SuggestionOptions = {
  onRequestImage?: ImagePickerHandler | null;
  enableImages?: boolean;
  imageSlashFallback?: SlashImageFallback;
};

type SuggestionProps = {
  editor: Editor;
  range: { from: number; to: number };
  query: string;
  clientRect?: (() => DOMRect | null) | null;
};

const requestImageAndInsert = async ({
  editor,
  range,
  onRequestImage,
  imageSlashFallback = "prompt-url",
}: ImagePickerContext & {
  onRequestImage?: ImagePickerHandler | null;
  imageSlashFallback?: SlashImageFallback;
}) => {

  let result: ImagePickerResult | null = null;
  if (onRequestImage) {
    result = await onRequestImage({ editor, range });
  } else if (imageSlashFallback === "prompt-url") {
    const src = window.prompt("Image URL")?.trim();
    result = src ? ({ src } satisfies ImagePickerResult) : null;
  }

  if (!result?.src) return;

  editor
    .chain()
    .focus()
    .deleteRange(range)
    .setImage({
      src: result.src,
      alt: result.alt ?? null,
      title: result.title ?? null,
    })
    .run();
};

const getAllItems = (options: SuggestionOptions): SlashItem[] => [
  {
    title: "Text",
    icon: Pilcrow,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    title: "Heading 1",
    icon: Heading1,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run(),
  },
  {
    title: "Heading 2",
    icon: Heading2,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
  },
  {
    title: "Heading 3",
    icon: Heading3,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run(),
  },
  {
    title: "Bulleted list",
    icon: List,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "Numbered list",
    icon: ListOrdered,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "Image",
    icon: Image,
    command: ({ editor, range }) => {
      void requestImageAndInsert({
        editor,
        range,
        onRequestImage: options.onRequestImage,
        imageSlashFallback: options.imageSlashFallback,
      });
    },
  },
  {
    title: "Table",
    icon: Table,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    title: "Quote",
    icon: Quote,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: "Code block",
    icon: Code,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
];

const createSuggestion = (options: SuggestionOptions = {}) => ({
  items: ({ query }: { query: string }) =>
    getAllItems(options)
      .filter((item) => options.enableImages !== false || item.title !== "Image")
      .filter((item) => item.title.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10),

  render: () => {
    let component: ReactRenderer<CommandsListHandle> | null = null;
    let popup: TippyInstance | null = null;

    return {
      onStart: (props: SuggestionProps) => {
        component = new ReactRenderer(CommandsList, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) return;
        const referenceRect = () => props.clientRect?.() ?? new DOMRect(0, 0, 0, 0);

        popup = tippy(document.body, {
          getReferenceClientRect: referenceRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: "manual",
          placement: "bottom-start",
        });
      },

      onUpdate: (props: SuggestionProps) => {
        component?.updateProps(props);
        if (!props.clientRect || !popup) return;
        const referenceRect = () => props.clientRect?.() ?? new DOMRect(0, 0, 0, 0);
        popup.setProps({ getReferenceClientRect: referenceRect });
      },

      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === "Escape" && popup) {
          popup.hide();
          return true;
        }

        return component?.ref?.onKeyDown(event) ?? false;
      },

      onExit: () => {
        if (popup) popup.destroy();
        component?.destroy();
      },
    };
  },
});

export default createSuggestion;
