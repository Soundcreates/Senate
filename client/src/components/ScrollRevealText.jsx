import { motion, useScroll, useTransform } from 'framer-motion';
import React, { useRef } from 'react';

export const ScrollRevealText = ({ children, style }) => {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"]
    });

    // Map scroll progress to color: Gray -> Gold/Brown -> Gray
    // Adjust keyframes [0, 0.5, 1] based on when you want the highlight to happen
    const color = useTransform(
        scrollYProgress,
        [0, 0.5, 0.8],
        ["rgba(242, 244, 243, 0.3)", "#a9927d", "rgba(242, 244, 243, 0.3)"]
    );

    return (
        <motion.span ref={ref} style={{ ...style, color }}>
            {children}
        </motion.span>
    );
};
