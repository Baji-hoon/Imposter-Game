import { describe, it, expect } from 'vitest';
import { tokens, CreamTheme, SunTheme, NightTheme } from '../src/theme';

describe('Neo-Brutalist Theme Tokens', () => {
  it('defines the required Section 1 colors', () => {
    expect(tokens.colors.ink).toBe('#111111');
    expect(tokens.colors.cream).toBe('#F4F1EA');
    expect(tokens.colors.paper).toBe('#FFFFFF');
    expect(tokens.colors.orange).toBe('#FF5A00');
    expect(tokens.colors.yellow).toBe('#FFB800');
    expect(tokens.colors.yellowSoft).toBe('#F9DA81');
    expect(tokens.colors.red).toBe('#E5322D');
    expect(tokens.colors.green).toBe('#1F9D55');
    expect(tokens.colors.grey).toBe('#8A8780');
  });

  it('enforces 0 border radius and 3pt stroke everywhere', () => {
    expect(tokens.shape.radius).toBe(0);
    expect(tokens.shape.stroke).toBe(3);
    expect(tokens.shape.strokeThin).toBe(2);
    expect(tokens.shape.shadow).toBe(4);
    expect(tokens.shape.shadowLarge).toBe(6);
    expect(tokens.shape.tap).toBe(56);
  });

  it('specifies the Abril Fatface display and Archivo body fonts', () => {
    expect(tokens.typography.fonts.display).toBe('AbrilFatface_400Regular');
    expect(tokens.typography.fonts.body).toBe('Archivo_500Medium');
    expect(tokens.typography.fonts.bodyBold).toBe('Archivo_700Bold');
    expect(tokens.typography.fonts.bodyBlack).toBe('Archivo_800ExtraBold');
  });

  it('configures 80ms press duration and (4,4) translation', () => {
    expect(tokens.motion.pressDuration).toBe(80);
    expect(tokens.motion.pressOffset).toBe(4);
  });

  it('uses a single cream light theme', () => {
    expect(CreamTheme.name).toBe('cream');
    expect(CreamTheme.colors.background).toBe(tokens.colors.cream);
    expect(SunTheme).toBe(CreamTheme);
    expect(NightTheme).toBe(CreamTheme);
  });
});
