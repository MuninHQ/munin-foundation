"""Fit captions using the installed Windows font, with no third-party package."""
import ctypes
import os
from functools import lru_cache


@lru_cache(maxsize=2048)
def measure(text, size):
    if os.name != 'nt':
        return len(text) * size * 1.2
    gdi = ctypes.WinDLL('gdi32', use_last_error=True)
    class Size(ctypes.Structure):
        _fields_ = [('cx', ctypes.c_long), ('cy', ctypes.c_long)]
    gdi.CreateCompatibleDC.argtypes = [ctypes.c_void_p]
    gdi.CreateCompatibleDC.restype = ctypes.c_void_p
    gdi.CreateFontW.argtypes = [ctypes.c_int] * 13 + [ctypes.c_wchar_p]
    gdi.CreateFontW.restype = ctypes.c_void_p
    gdi.SelectObject.argtypes = [ctypes.c_void_p, ctypes.c_void_p]
    gdi.SelectObject.restype = ctypes.c_void_p
    gdi.GetTextExtentPoint32W.argtypes = [ctypes.c_void_p, ctypes.c_wchar_p, ctypes.c_int, ctypes.POINTER(Size)]
    gdi.DeleteObject.argtypes = [ctypes.c_void_p]
    gdi.DeleteDC.argtypes = [ctypes.c_void_p]
    dc = gdi.CreateCompatibleDC(None)
    font = gdi.CreateFontW(-size, 0, 0, 0, 400, 0, 0, 0, 1, 0, 0, 4, 0, 'Segoe UI')
    if not dc or not font:
        if font: gdi.DeleteObject(font)
        if dc: gdi.DeleteDC(dc)
        raise RuntimeError('Could not measure the installed caption font')
    old = gdi.SelectObject(dc, font)
    try:
        bounds = Size()
        if not gdi.GetTextExtentPoint32W(dc, text, len(text.encode('utf-16-le')) // 2, ctypes.byref(bounds)):
            raise RuntimeError('Caption measurement failed')
        return bounds.cx
    finally:
        gdi.SelectObject(dc, old)
        gdi.DeleteObject(font)
        gdi.DeleteDC(dc)


def layout(text, width, height):
    max_width = width - 64
    for size in range(23 if width < height else 24, 9, -1):
        lines, current = [], ''
        for word in text.split():
            candidate = (current + ' ' + word).strip()
            if current and measure(candidate, size) > max_width - 12:
                lines.append(current)
                current = word
            else:
                current = candidate
        if current:
            lines.append(current)
        if all(measure(line, size) <= max_width - 12 for line in lines) and len(lines) * (size * 1.5 + 10) <= height - 140:
            return lines, size
    raise ValueError('Caption cannot fit safely; shorten this scene')
