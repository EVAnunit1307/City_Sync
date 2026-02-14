import { RefObject, useEffect, useRef } from "react";

type MousePosition = {
  x: number;
  y: number;
};

export function useMousePositionRef(
  containerRef: RefObject<HTMLElement | null>,
) {
  const mousePositionRef = useRef<MousePosition>({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const relativeX = (event.clientX - rect.left) / rect.width - 0.5;
      const relativeY = (event.clientY - rect.top) / rect.height - 0.5;

      mousePositionRef.current.x = relativeX * 2;
      mousePositionRef.current.y = relativeY * 2;
    };

    const handleMouseLeave = () => {
      mousePositionRef.current.x = 0;
      mousePositionRef.current.y = 0;
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [containerRef]);

  return mousePositionRef;
}
