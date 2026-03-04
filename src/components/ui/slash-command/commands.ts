import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import createSuggestion, { type ImagePickerHandler } from "./suggestion";

type SlashCommandsOptions = {
  onRequestImage: ImagePickerHandler | null;
};

const SlashCommands = Extension.create<SlashCommandsOptions>({
  name: "slash-commands",

  addOptions() {
    return {
      onRequestImage: null,
    };
  },

  addProseMirrorPlugins() {
    const suggestion = createSuggestion({
      onRequestImage: this.options.onRequestImage,
    });

    return [
      Suggestion({
        editor: this.editor,
        char: "/",
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },
        ...suggestion,
      }),
    ];
  },
});

export default SlashCommands;
