import NiceAvatar, { genConfig } from "react-nice-avatar";

export function AvatarImage({ 
    seed, 
    size = 40, 
    avatarRef 
}: { 
    seed: string; 
    size?: number; 
    avatarRef?: React.RefObject<HTMLDivElement> 
}) {
    const config = genConfig(seed || "default");
    return (
        <div ref={avatarRef} className="w-full">
            <NiceAvatar style={{ width: size, height: size }} {...config} />
        </div>
    );
}