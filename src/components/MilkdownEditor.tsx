import { type ReactNode, useEffect, useRef } from "react";
import { Crepe } from "@milkdown/crepe";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { getMarkdown, replaceAll } from "@milkdown/kit/utils";
import { editorViewCtx } from "@milkdown/kit/core";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";

interface MilkdownEditorInnerProps {
    markdown: string;
    onChange: (markdown: string) => void;
    placeholder?: string;
}

function MilkdownEditorInner({ markdown, onChange, placeholder }: MilkdownEditorInnerProps) {
    const prevMarkdownRef = useRef<string>("");
    const updatingRef = useRef(false);
    const lastPropRef = useRef<string>("");

    const { loading, get } = useEditor((root) => {
        return new Crepe({
            root,
            defaultValue: markdown,
            features: {
                [Crepe.Feature.Latex]: true,
                [Crepe.Feature.AI]: false,
            },
            featureConfigs: {
                [Crepe.Feature.Placeholder]: {
                    text: placeholder || "",
                },
                [Crepe.Feature.ImageBlock]: {
                    onUpload: async (_) => {
                        alert("暂不支持上传本地图片，请使用图片链接。");
                        return "";
                    },
                    inlineUploadButton: "",
                    blockUploadButton: "",
                    blockUploadPlaceholderText: "",
                },
            },
        });
    }, []);

    useEffect(() => {
        if (loading) return;
        const instance = get();
        if (!instance) return;

        // Only sync if the markdown prop actually changed (not on every re-render)
        if (markdown === lastPropRef.current) return;
        lastPropRef.current = markdown;

        const currentMarkdown = instance.action(getMarkdown());
        if (currentMarkdown === markdown) return;

        updatingRef.current = true;
        instance.action(replaceAll(markdown, true));
        prevMarkdownRef.current = markdown;
        setTimeout(() => {
            updatingRef.current = false;
        }, 0);
    }, [markdown, loading, get]);

    useEffect(() => {
        if (loading) return;
        const instance = get();
        if (!instance) return;

        const view = instance.action((ctx) => {
            return ctx.get(editorViewCtx);
        });
        if (!view) return;

        const handleInput = () => {
            if (updatingRef.current) return;
            const md = instance.action(getMarkdown());
            if (md !== prevMarkdownRef.current) {
                prevMarkdownRef.current = md;
                onChange(md);
            }
        };

        view.dom.addEventListener("input", handleInput);
        return () => {
            view.dom.removeEventListener("input", handleInput);
        };
    }, [loading, get, onChange]);

    return <Milkdown />;
}

interface MilkdownEditorProps {
    markdown: string;
    onChange: (markdown: string) => void;
    placeholder?: ReactNode;
}

export default function MilkdownEditor({ markdown, onChange, placeholder }: MilkdownEditorProps) {
    return (
        <div className="text-sm">
            <MilkdownProvider>
                <MilkdownEditorInner
                    markdown={markdown}
                    onChange={onChange}
                    placeholder={typeof placeholder === "string" ? placeholder : undefined}
                />
            </MilkdownProvider>
        </div>
    );
}
