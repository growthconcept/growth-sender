import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('renderiza o texto corretamente', () => {
    render(<Button>Salvar</Button>);
    expect(screen.getByText('Salvar')).toBeInTheDocument();
  });

  it('chama onClick ao clicar', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Clique aqui</Button>);
    await userEvent.click(screen.getByText('Clique aqui'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('não dispara onClick quando desabilitado', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick} disabled>Desabilitado</Button>);
    await userEvent.click(screen.getByText('Desabilitado'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('aplica variante destructive', () => {
    const { container } = render(<Button variant="destructive">Deletar</Button>);
    expect(container.firstChild).toHaveClass('bg-destructive');
  });

  it('aplica variante outline', () => {
    const { container } = render(<Button variant="outline">Cancelar</Button>);
    expect(container.firstChild).toHaveClass('border');
  });
});
