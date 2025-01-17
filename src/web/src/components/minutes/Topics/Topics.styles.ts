import styled from 'styled-components'; // ^5.3.0
import { lightTheme } from '../../../assets/styles/theme';

export const TopicsContainer = styled.div`
  padding: ${props => props.theme.spacing.md};
  background-color: ${props => props.theme.palette.white};
  border-radius: ${props => props.theme.effects.roundedCorner4};
  box-shadow: ${props => props.theme.effects.elevation4};
  role: 'region';
  aria-label: 'Meeting Topics';
  transition: all ${props => props.theme.animation.duration.medium} ${props => props.theme.animation.easing.easeInOut};
  @media (prefers-reduced-motion: reduce) { 
    transition: none;
  }
  direction: ${props => props.theme.direction};
  
  @media (max-width: ${props => props.theme.breakpoints.sm}px) {
    padding: ${props => props.theme.spacing.sm};
  }
`;

export const TopicItem = styled.div`
  margin-block-end: ${props => props.theme.spacing.sm};
  padding: ${props => props.theme.spacing.sm};
  border-radius: ${props => props.theme.effects.roundedCorner2};
  background-color: ${props => props.theme.palette.neutralLighter};
  transition: background-color ${props => props.theme.animation.duration.fast} ${props => props.theme.animation.easing.easeOut};
  
  &:hover {
    background-color: ${props => props.theme.palette.neutralLight};
  }
  
  &:focus-within {
    outline: 2px solid ${props => props.theme.palette.themePrimary};
    outline-offset: 2px;
  }
  
  position: relative;
  
  @media (max-width: ${props => props.theme.breakpoints.sm}px) {
    margin-block-end: ${props => props.theme.spacing.xs};
  }
`;

export const TopicTitle = styled.h3`
  font-family: ${props => props.theme.fonts.mediumPlus.fontFamily};
  font-size: ${props => props.theme.fonts.mediumPlus.fontSize};
  font-weight: ${props => props.theme.fonts.xLarge.fontWeight};
  color: ${props => props.theme.palette.neutralPrimary};
  margin-block-end: ${props => props.theme.spacing.xs};
  line-height: 1.4;
  letter-spacing: -0.01em;
  
  @media (max-width: ${props => props.theme.breakpoints.sm}px) {
    font-size: ${props => props.theme.fonts.medium.fontSize};
  }
`;

export const SubtopicList = styled.ul`
  list-style-type: none;
  padding-inline-start: ${props => props.theme.spacing.lg};
  margin-block-start: ${props => props.theme.spacing.xs};
  role: 'list';
  position: relative;
  margin: 0;
  padding: 0;

  &::before {
    content: '';
    position: absolute;
    left: 8px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: ${props => props.theme.palette.neutralLight};
  }

  @media (max-width: ${props => props.theme.breakpoints.sm}px) {
    padding-inline-start: ${props => props.theme.spacing.md};
  }
`;

export const SubtopicItem = styled.li`
  font-family: ${props => props.theme.fonts.medium.fontFamily};
  font-size: ${props => props.theme.fonts.medium.fontSize};
  color: ${props => props.theme.palette.neutralSecondary};
  margin-block-end: ${props => props.theme.spacing.xxs};
  padding: ${props => props.theme.spacing.xs};
  transition: color ${props => props.theme.animation.duration.fast} ${props => props.theme.animation.easing.easeOut};
  
  &:hover {
    color: ${props => props.theme.palette.neutralPrimary};
  }
  
  &:focus-visible {
    outline: 2px solid ${props => props.theme.palette.themePrimary};
    outline-offset: 2px;
  }
  
  position: relative;
  min-height: 44px; // Ensures touch target size meets accessibility standards
  display: flex;
  align-items: center;
  
  @media (max-width: ${props => props.theme.breakpoints.sm}px) {
    font-size: ${props => props.theme.fonts.medium.fontSize};
  }
`;