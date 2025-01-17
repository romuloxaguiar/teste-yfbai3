import styled from 'styled-components'; // ^5.3.0
import { css } from 'styled-components'; // ^5.3.0
import { lightTheme, darkTheme, highContrastTheme } from '../../../assets/styles/theme';

export const Container = styled.div`
  padding: ${({theme}) => theme.spacing.md};
  background: ${({theme}) => theme.palette.neutralLighter};
  border-radius: ${({theme}) => theme.effects.borderRadius.medium};
  margin-bottom: ${({theme}) => theme.spacing.lg};
  outline: none;
  transition: background-color ${({theme}) => theme.effects.transition.fast};

  @media (max-width: 768px) {
    padding: ${({theme}) => theme.spacing.sm};
  }

  @media (forced-colors: active) {
    border: 1px solid currentColor;
  }
`;

export const Header = styled.h2`
  font-family: ${({theme}) => theme.typography.fontFamily};
  font-size: ${({theme}) => theme.typography.sizes.lg};
  font-weight: ${({theme}) => theme.typography.weights.medium};
  color: ${({theme}) => theme.palette.neutralPrimary};
  margin-bottom: ${({theme}) => theme.spacing.md};
  line-height: 1.3;
  
  @media (max-width: 768px) {
    font-size: ${({theme}) => theme.typography.sizes.md};
  }
`;

export const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: ${({theme}) => theme.spacing.sm};

  @media (max-width: 768px) {
    gap: ${({theme}) => theme.spacing.xs};
  }
`;

export const Item = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({theme}) => theme.spacing.sm};
  background: ${({theme}) => theme.palette.white};
  border-radius: ${({theme}) => theme.effects.borderRadius.small};
  box-shadow: ${({theme}) => theme.effects.elevation.small};
  transition: all ${({theme}) => theme.effects.transition.fast};
  min-height: 44px; // Touch-friendly target size
  
  &:focus-visible {
    outline: 2px solid ${({theme}) => theme.palette.themePrimary};
    outline-offset: 2px;
  }

  &:hover {
    box-shadow: ${({theme}) => theme.effects.elevation.medium};
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }

  @media (forced-colors: active) {
    border: 1px solid currentColor;
    box-shadow: none;
  }
`;

export const AssigneeTag = styled.span`
  display: inline-flex;
  align-items: center;
  padding: ${({theme}) => theme.spacing.xs} ${({theme}) => theme.spacing.sm};
  background: ${({theme}) => theme.palette.themePrimary};
  color: ${({theme}) => theme.palette.white};
  border-radius: ${({theme}) => theme.effects.borderRadius.small};
  font-size: ${({theme}) => theme.typography.sizes.sm};
  font-weight: ${({theme}) => theme.typography.weights.medium};
  min-height: 32px; // Touch-friendly target size

  @media (forced-colors: active) {
    border: 1px solid currentColor;
    background: transparent;
    color: currentColor;
  }

  @media (max-width: 768px) {
    margin-top: ${({theme}) => theme.spacing.xs};
  }
`;